// Vite's ?raw suffix imports a file's text, which is how the tests load the shell fixture
// inside workerd (there is no filesystem there).
declare module '*?raw' {
  const content: string;
  export default content;
}
