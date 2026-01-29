// Template: Landing Page
// Categoria: web
// Palavras-chave: landing, página, site, html, css, apresentação

export const landingPageTemplate = {
  id: "landing-page",
  name: "Landing Page",
  category: "web",
  description: "Landing page moderna e responsiva com HTML, CSS e JavaScript",
  keywords: [
    "landing", "página", "site", "html", "css", "apresentação", "homepage",
    "website", "institucional", "empresa", "produto", "serviço", "responsivo"
  ],
  files: {
    "index.html": `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Minha Landing Page</title>
  <link rel="stylesheet" href="styles.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <!-- Header -->
  <header class="header">
    <nav class="nav container">
      <a href="#" class="logo">MeuProduto</a>
      <ul class="nav-links">
        <li><a href="#features">Recursos</a></li>
        <li><a href="#pricing">Preços</a></li>
        <li><a href="#contact">Contato</a></li>
        <li><a href="#" class="btn btn-primary">Começar Agora</a></li>
      </ul>
      <button class="mobile-menu" aria-label="Menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </nav>
  </header>

  <!-- Hero Section -->
  <section class="hero">
    <div class="container">
      <h1>Transforme suas ideias em realidade</h1>
      <p>Solução completa para impulsionar seu negócio com tecnologia de ponta.</p>
      <div class="hero-buttons">
        <a href="#" class="btn btn-primary btn-large">Começar Grátis</a>
        <a href="#" class="btn btn-outline btn-large">Ver Demo</a>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section id="features" class="features">
    <div class="container">
      <h2>Por que escolher nossa solução?</h2>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🚀</div>
          <h3>Rápido</h3>
          <p>Performance otimizada para resultados instantâneos.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🔒</div>
          <h3>Seguro</h3>
          <p>Seus dados protegidos com criptografia de ponta.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📱</div>
          <h3>Responsivo</h3>
          <p>Funciona perfeitamente em qualquer dispositivo.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">💡</div>
          <h3>Intuitivo</h3>
          <p>Interface simples e fácil de usar.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Pricing Section -->
  <section id="pricing" class="pricing">
    <div class="container">
      <h2>Planos e Preços</h2>
      <div class="pricing-grid">
        <div class="pricing-card">
          <h3>Básico</h3>
          <div class="price">R$ 0<span>/mês</span></div>
          <ul>
            <li>5 projetos</li>
            <li>1GB armazenamento</li>
            <li>Suporte por email</li>
          </ul>
          <a href="#" class="btn btn-outline">Começar Grátis</a>
        </div>
        <div class="pricing-card featured">
          <div class="badge">Popular</div>
          <h3>Pro</h3>
          <div class="price">R$ 49<span>/mês</span></div>
          <ul>
            <li>Projetos ilimitados</li>
            <li>50GB armazenamento</li>
            <li>Suporte prioritário</li>
            <li>API access</li>
          </ul>
          <a href="#" class="btn btn-primary">Assinar Agora</a>
        </div>
        <div class="pricing-card">
          <h3>Enterprise</h3>
          <div class="price">Sob consulta</div>
          <ul>
            <li>Tudo do Pro</li>
            <li>Armazenamento ilimitado</li>
            <li>Suporte 24/7</li>
            <li>SLA garantido</li>
          </ul>
          <a href="#" class="btn btn-outline">Falar com Vendas</a>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="cta">
    <div class="container">
      <h2>Pronto para começar?</h2>
      <p>Junte-se a milhares de clientes satisfeitos.</p>
      <a href="#" class="btn btn-primary btn-large">Criar Conta Grátis</a>
    </div>
  </section>

  <!-- Footer -->
  <footer id="contact" class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <h4>MeuProduto</h4>
          <p>Transformando ideias em soluções digitais.</p>
        </div>
        <div class="footer-col">
          <h4>Links</h4>
          <ul>
            <li><a href="#">Sobre</a></li>
            <li><a href="#">Blog</a></li>
            <li><a href="#">Carreiras</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Suporte</h4>
          <ul>
            <li><a href="#">FAQ</a></li>
            <li><a href="#">Documentação</a></li>
            <li><a href="#">Contato</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Contato</h4>
          <p>contato@meuproduto.com</p>
          <p>(11) 99999-9999</p>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2024 MeuProduto. Todos os direitos reservados.</p>
      </div>
    </div>
  </footer>

  <script src="script.js"></script>
</body>
</html>`,
    "styles.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --text: #1f2937;
  --text-light: #6b7280;
  --bg: #ffffff;
  --bg-alt: #f9fafb;
  --border: #e5e7eb;
}

body {
  font-family: 'Inter', sans-serif;
  color: var(--text);
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Header */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
  z-index: 1000;
}

.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 30px;
  list-style: none;
}

.nav-links a {
  color: var(--text);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s;
}

.nav-links a:hover {
  color: var(--primary);
}

.mobile-menu {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
}

.mobile-menu span {
  width: 25px;
  height: 3px;
  background: var(--text);
  border-radius: 3px;
}

/* Buttons */
.btn {
  display: inline-block;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-outline {
  border: 2px solid var(--primary);
  color: var(--primary);
  background: transparent;
}

.btn-outline:hover {
  background: var(--primary);
  color: white;
}

.btn-large {
  padding: 15px 30px;
  font-size: 1.1rem;
}

/* Hero */
.hero {
  padding: 150px 0 100px;
  text-align: center;
  background: linear-gradient(135deg, #f5f7ff 0%, #ffffff 100%);
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 20px;
  line-height: 1.2;
}

.hero p {
  font-size: 1.25rem;
  color: var(--text-light);
  margin-bottom: 30px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.hero-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

/* Features */
.features {
  padding: 100px 0;
}

.features h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 50px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.feature-card {
  padding: 30px;
  border-radius: 12px;
  border: 1px solid var(--border);
  text-align: center;
  transition: transform 0.3s, box-shadow 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.feature-card h3 {
  margin-bottom: 10px;
}

.feature-card p {
  color: var(--text-light);
}

/* Pricing */
.pricing {
  padding: 100px 0;
  background: var(--bg-alt);
}

.pricing h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 50px;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
  max-width: 1000px;
  margin: 0 auto;
}

.pricing-card {
  background: white;
  padding: 40px 30px;
  border-radius: 12px;
  border: 1px solid var(--border);
  text-align: center;
  position: relative;
}

.pricing-card.featured {
  border-color: var(--primary);
  transform: scale(1.05);
}

.pricing-card .badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--primary);
  color: white;
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.pricing-card h3 {
  font-size: 1.5rem;
  margin-bottom: 15px;
}

.price {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 20px;
}

.price span {
  font-size: 1rem;
  font-weight: 400;
  color: var(--text-light);
}

.pricing-card ul {
  list-style: none;
  margin-bottom: 30px;
}

.pricing-card li {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.pricing-card li:last-child {
  border-bottom: none;
}

/* CTA */
.cta {
  padding: 100px 0;
  text-align: center;
  background: var(--primary);
  color: white;
}

.cta h2 {
  font-size: 2.5rem;
  margin-bottom: 15px;
}

.cta p {
  font-size: 1.25rem;
  margin-bottom: 30px;
  opacity: 0.9;
}

.cta .btn-primary {
  background: white;
  color: var(--primary);
}

.cta .btn-primary:hover {
  background: var(--bg-alt);
}

/* Footer */
.footer {
  padding: 60px 0 30px;
  background: var(--text);
  color: white;
}

.footer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 40px;
  margin-bottom: 40px;
}

.footer-col h4 {
  margin-bottom: 15px;
  font-size: 1.1rem;
}

.footer-col ul {
  list-style: none;
}

.footer-col li {
  margin-bottom: 10px;
}

.footer-col a {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 0.3s;
}

.footer-col a:hover {
  color: white;
}

.footer-col p {
  color: rgba(255, 255, 255, 0.7);
}

.footer-bottom {
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-bottom p {
  color: rgba(255, 255, 255, 0.5);
}

/* Responsive */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
  
  .mobile-menu {
    display: flex;
  }
  
  .hero h1 {
    font-size: 2rem;
  }
  
  .hero p {
    font-size: 1rem;
  }
  
  .pricing-card.featured {
    transform: scale(1);
  }
}`,
    "script.js": `// Mobile menu toggle
const mobileMenu = document.querySelector('.mobile-menu');
const navLinks = document.querySelector('.nav-links');

mobileMenu?.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Header scroll effect
const header = document.querySelector('.header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 100) {
    header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
  } else {
    header.style.boxShadow = 'none';
  }
});

console.log('Landing page carregada com sucesso!');`,
    "README.md": `# Landing Page

Landing page moderna e responsiva.

## Funcionalidades

- Design moderno e limpo
- 100% responsivo
- Seções: Hero, Features, Pricing, CTA, Footer
- Scroll suave
- Menu mobile

## Como usar

Abra \`index.html\` no navegador ou use um servidor local:

\`\`\`bash
npx serve .
\`\`\`

## Personalização

1. Edite \`index.html\` para mudar textos
2. Modifique \`styles.css\` para cores e estilos
3. Adicione funcionalidades em \`script.js\`

## Cores

Altere as variáveis CSS em \`:root\`:

\`\`\`css
:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
}
\`\`\`
`
  }
};

export default landingPageTemplate;
