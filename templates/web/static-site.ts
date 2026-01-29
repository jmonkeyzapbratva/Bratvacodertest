// Template: Site Estático
// Categoria: web
// Palavras-chave: site, estático, html, portfolio, blog

export const staticSiteTemplate = {
  id: "static-site",
  name: "Site Estático",
  category: "web",
  description: "Site estático multi-página com HTML, CSS e JavaScript",
  keywords: [
    "site", "estático", "html", "portfolio", "blog", "pessoal",
    "currículo", "cv", "apresentação", "simples", "página"
  ],
  files: {
    "index.html": `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meu Site</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="header">
    <nav class="nav">
      <a href="index.html" class="logo">MeuSite</a>
      <ul class="nav-menu">
        <li><a href="index.html" class="active">Home</a></li>
        <li><a href="sobre.html">Sobre</a></li>
        <li><a href="projetos.html">Projetos</a></li>
        <li><a href="contato.html">Contato</a></li>
      </ul>
    </nav>
  </header>

  <main>
    <section class="hero">
      <h1>Olá, eu sou [Seu Nome]</h1>
      <p>Desenvolvedor Web | Designer | Criador</p>
      <a href="projetos.html" class="btn">Ver Projetos</a>
    </section>

    <section class="features">
      <div class="container">
        <div class="feature">
          <h3>Design</h3>
          <p>Interfaces bonitas e funcionais</p>
        </div>
        <div class="feature">
          <h3>Código</h3>
          <p>Desenvolvimento web moderno</p>
        </div>
        <div class="feature">
          <h3>Performance</h3>
          <p>Sites rápidos e otimizados</p>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <p>&copy; 2024 MeuSite. Todos os direitos reservados.</p>
  </footer>
</body>
</html>`,
    "sobre.html": `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sobre - Meu Site</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="header">
    <nav class="nav">
      <a href="index.html" class="logo">MeuSite</a>
      <ul class="nav-menu">
        <li><a href="index.html">Home</a></li>
        <li><a href="sobre.html" class="active">Sobre</a></li>
        <li><a href="projetos.html">Projetos</a></li>
        <li><a href="contato.html">Contato</a></li>
      </ul>
    </nav>
  </header>

  <main class="page">
    <div class="container">
      <h1>Sobre Mim</h1>
      <div class="about-content">
        <div class="about-text">
          <p>Olá! Sou um desenvolvedor apaixonado por criar soluções digitais.</p>
          <p>Tenho experiência em desenvolvimento web, design de interfaces e automação.</p>
          <h2>Habilidades</h2>
          <ul>
            <li>HTML, CSS, JavaScript</li>
            <li>React, Node.js</li>
            <li>Python, Automação</li>
            <li>UI/UX Design</li>
          </ul>
        </div>
      </div>
    </div>
  </main>

  <footer class="footer">
    <p>&copy; 2024 MeuSite. Todos os direitos reservados.</p>
  </footer>
</body>
</html>`,
    "projetos.html": `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Projetos - Meu Site</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="header">
    <nav class="nav">
      <a href="index.html" class="logo">MeuSite</a>
      <ul class="nav-menu">
        <li><a href="index.html">Home</a></li>
        <li><a href="sobre.html">Sobre</a></li>
        <li><a href="projetos.html" class="active">Projetos</a></li>
        <li><a href="contato.html">Contato</a></li>
      </ul>
    </nav>
  </header>

  <main class="page">
    <div class="container">
      <h1>Meus Projetos</h1>
      <div class="projects-grid">
        <div class="project-card">
          <h3>Projeto 1</h3>
          <p>Descrição do projeto 1</p>
          <a href="#" class="btn btn-small">Ver mais</a>
        </div>
        <div class="project-card">
          <h3>Projeto 2</h3>
          <p>Descrição do projeto 2</p>
          <a href="#" class="btn btn-small">Ver mais</a>
        </div>
        <div class="project-card">
          <h3>Projeto 3</h3>
          <p>Descrição do projeto 3</p>
          <a href="#" class="btn btn-small">Ver mais</a>
        </div>
      </div>
    </div>
  </main>

  <footer class="footer">
    <p>&copy; 2024 MeuSite. Todos os direitos reservados.</p>
  </footer>
</body>
</html>`,
    "contato.html": `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contato - Meu Site</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="header">
    <nav class="nav">
      <a href="index.html" class="logo">MeuSite</a>
      <ul class="nav-menu">
        <li><a href="index.html">Home</a></li>
        <li><a href="sobre.html">Sobre</a></li>
        <li><a href="projetos.html">Projetos</a></li>
        <li><a href="contato.html" class="active">Contato</a></li>
      </ul>
    </nav>
  </header>

  <main class="page">
    <div class="container">
      <h1>Contato</h1>
      <form class="contact-form" action="#" method="POST">
        <div class="form-group">
          <label for="name">Nome</label>
          <input type="text" id="name" name="name" required>
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
          <label for="message">Mensagem</label>
          <textarea id="message" name="message" rows="5" required></textarea>
        </div>
        <button type="submit" class="btn">Enviar</button>
      </form>
    </div>
  </main>

  <footer class="footer">
    <p>&copy; 2024 MeuSite. Todos os direitos reservados.</p>
  </footer>
</body>
</html>`,
    "css/style.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Header */
.header {
  background: #fff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  max-width: 1100px;
  margin: 0 auto;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #6366f1;
  text-decoration: none;
}

.nav-menu {
  display: flex;
  list-style: none;
  gap: 25px;
}

.nav-menu a {
  text-decoration: none;
  color: #666;
  font-weight: 500;
  transition: color 0.3s;
}

.nav-menu a:hover,
.nav-menu a.active {
  color: #6366f1;
}

/* Hero */
.hero {
  text-align: center;
  padding: 100px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.hero h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.hero p {
  font-size: 1.2rem;
  margin-bottom: 30px;
  opacity: 0.9;
}

/* Button */
.btn {
  display: inline-block;
  padding: 12px 30px;
  background: #6366f1;
  color: white;
  text-decoration: none;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s;
}

.btn:hover {
  background: #4f46e5;
}

.btn-small {
  padding: 8px 20px;
  font-size: 0.9rem;
}

.hero .btn {
  background: white;
  color: #6366f1;
}

.hero .btn:hover {
  background: #f0f0f0;
}

/* Features */
.features {
  padding: 60px 20px;
  background: #f9fafb;
}

.features .container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.feature {
  text-align: center;
  padding: 30px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.feature h3 {
  margin-bottom: 10px;
  color: #6366f1;
}

/* Page */
.page {
  padding: 60px 20px;
  min-height: 60vh;
}

.page h1 {
  margin-bottom: 30px;
  color: #333;
}

/* Projects */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 25px;
}

.project-card {
  padding: 25px;
  background: #f9fafb;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

.project-card h3 {
  margin-bottom: 10px;
}

.project-card p {
  margin-bottom: 15px;
  color: #666;
}

/* Contact Form */
.contact-form {
  max-width: 500px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #6366f1;
}

/* About */
.about-content ul {
  margin-top: 15px;
  padding-left: 20px;
}

.about-content li {
  margin-bottom: 8px;
}

.about-content h2 {
  margin-top: 30px;
  margin-bottom: 15px;
}

/* Footer */
.footer {
  text-align: center;
  padding: 30px;
  background: #1f2937;
  color: #9ca3af;
}

/* Responsive */
@media (max-width: 768px) {
  .hero h1 {
    font-size: 1.8rem;
  }
  
  .nav-menu {
    gap: 15px;
  }
}`,
    "README.md": `# Site Estático

Site multi-página com HTML, CSS e JavaScript.

## Páginas

- index.html - Página inicial
- sobre.html - Sobre mim
- projetos.html - Portfolio
- contato.html - Formulário de contato

## Como usar

Abra \`index.html\` no navegador ou use um servidor:

\`\`\`bash
npx serve .
\`\`\`

## Personalização

1. Edite os arquivos HTML
2. Modifique \`css/style.css\` para estilos
3. Adicione suas imagens em uma pasta \`img/\`
`
  }
};

export default staticSiteTemplate;
