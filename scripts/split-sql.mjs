// Splits a SQL file into single statements. Semicolons inside comments, quoted
// text or $$ function bodies are not treated as statement breaks.
export function splitStatements(source) {
  const statements = [];
  let current = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    const two = source.slice(i, i + 2);
    if (two === "--") {
      // Line comment: skip to the end of the line.
      const end = source.indexOf("\n", i);
      i = end === -1 ? source.length : end;
    } else if (two === "$$") {
      const end = source.indexOf("$$", i + 2);
      if (end === -1) throw new Error("Unclosed $$ block in SQL.");
      current += source.slice(i, end + 2);
      i = end + 2;
    } else if (ch === "'") {
      // Quoted text; '' is an escaped quote.
      let j = i + 1;
      while (j < source.length && !(source[j] === "'" && source[j + 1] !== "'")) j += source[j] === "'" ? 2 : 1;
      current += source.slice(i, j + 1);
      i = j + 1;
    } else if (ch === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      i++;
    } else {
      current += ch;
      i++;
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}
