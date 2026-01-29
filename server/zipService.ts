import archiver from "archiver";
import { Readable } from "stream";

interface FileStructure {
  name: string;
  content: string;
}

export async function createProjectZip(
  code: string,
  language: string,
  projectName: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    const files = generateFileStructure(code, language, projectName);

    for (const file of files) {
      archive.append(file.content, { name: file.name });
    }

    archive.finalize();
  });
}

function generateFileStructure(
  code: string,
  language: string,
  projectName: string
): FileStructure[] {
  const files: FileStructure[] = [];
  const safeName = projectName.toLowerCase().replace(/[^a-z0-9]/g, "-");

  switch (language) {
    case "html":
      files.push(
        { name: `${safeName}/index.html`, content: code },
        { name: `${safeName}/README.md`, content: generateReadme(projectName, language) }
      );
      break;

    case "python":
      files.push(
        { name: `${safeName}/main.py`, content: code },
        { name: `${safeName}/requirements.txt`, content: "requests>=2.28.0\n" },
        { name: `${safeName}/README.md`, content: generateReadme(projectName, language) }
      );
      break;

    case "javascript":
    default:
      const packageJson = generatePackageJson(safeName, code);
      files.push(
        { name: `${safeName}/index.js`, content: code },
        { name: `${safeName}/package.json`, content: packageJson },
        { name: `${safeName}/README.md`, content: generateReadme(projectName, language) },
        { name: `${safeName}/.gitignore`, content: "node_modules/\n.env\n" }
      );
      break;
  }

  return files;
}

function generatePackageJson(name: string, code: string): string {
  const dependencies: Record<string, string> = {};

  // Detect dependencies from code
  if (code.includes("express")) dependencies["express"] = "^4.18.2";
  if (code.includes("cors")) dependencies["cors"] = "^2.8.5";
  if (code.includes("helmet")) dependencies["helmet"] = "^7.1.0";
  if (code.includes("@whiskeysockets/baileys")) {
    dependencies["@whiskeysockets/baileys"] = "^6.6.0";
    dependencies["qrcode-terminal"] = "^0.12.0";
  }
  if (code.includes("axios")) dependencies["axios"] = "^1.6.0";

  // If no dependencies detected, add basic ones
  if (Object.keys(dependencies).length === 0) {
    // No dependencies needed for simple scripts
  }

  return JSON.stringify(
    {
      name,
      version: "1.0.0",
      description: `Projeto gerado pelo BRATVACODER`,
      main: "index.js",
      scripts: {
        start: "node index.js",
        dev: "node --watch index.js"
      },
      keywords: ["bratvacoder", "generated"],
      author: "",
      license: "MIT",
      dependencies,
    },
    null,
    2
  );
}

export function parseCodeToFiles(code: string, language: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];

  switch (language) {
    case "html":
      files.push({ path: "index.html", content: code });
      break;
    case "python":
      files.push(
        { path: "main.py", content: code },
        { path: "requirements.txt", content: "requests>=2.28.0\n" }
      );
      break;
    case "php":
      files.push({ path: "index.php", content: code });
      break;
    case "typescript":
      files.push(
        { path: "src/index.ts", content: code },
        { path: "tsconfig.json", content: JSON.stringify({
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            strict: true,
            esModuleInterop: true,
            outDir: "./dist"
          },
          include: ["src/**/*"]
        }, null, 2) }
      );
      break;
    case "javascript":
    default:
      files.push(
        { path: "index.js", content: code },
        { path: "package.json", content: generatePackageJson("projeto", code) },
        { path: ".gitignore", content: "node_modules/\n.env\n" }
      );
      break;
  }

  files.push({ path: "README.md", content: generateReadme("Projeto BRATVACODER", language) });
  
  return files;
}

function generateReadme(projectName: string, language: string): string {
  const installInstructions = {
    javascript: `## Instalação

\`\`\`bash
npm install
\`\`\`

## Uso

\`\`\`bash
npm start
\`\`\`
`,
    python: `## Instalação

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Uso

\`\`\`bash
python main.py
\`\`\`
`,
    html: `## Uso

Abra o arquivo \`index.html\` no seu navegador.
`,
  };

  return `# ${projectName}

Projeto gerado automaticamente pelo **BRATVACODER** - Gerador de Código com IA.

${installInstructions[language as keyof typeof installInstructions] || installInstructions.javascript}

## Sobre

Este projeto foi criado usando inteligência artificial para acelerar seu desenvolvimento.

---

*Gerado por BRATVACODER*
`;
}
