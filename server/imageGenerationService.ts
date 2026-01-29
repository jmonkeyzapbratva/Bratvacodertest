import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  localPath: string;
  width: number;
  height: number;
  createdAt: Date;
}

interface ImageGenerationOptions {
  prompt: string;
  style?: "icon" | "logo" | "illustration" | "photo" | "ui";
  size?: "256x256" | "512x512" | "1024x1024";
  projectId?: number;
}

class ImageGenerationService {
  private openai: OpenAI | null = null;
  private outputDir = "generated_images";

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY not configured");
      }
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generate(options: ImageGenerationOptions): Promise<GeneratedImage> {
    const { prompt, style = "illustration", size = "512x512" } = options;
    
    const stylePrompts: Record<string, string> = {
      icon: "Simple flat icon design, minimal, clean, solid colors, centered, no text",
      logo: "Professional logo design, minimal, memorable, scalable vector style",
      illustration: "Digital illustration, colorful, modern style",
      photo: "Photorealistic, high quality, professional photography",
      ui: "UI element design, clean, modern, web/app interface style",
    };

    const enhancedPrompt = `${stylePrompts[style] || ""} ${prompt}`;

    try {
      const openai = this.getOpenAI();
      
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: size === "256x256" ? "1024x1024" : size === "512x512" ? "1024x1024" : "1024x1024",
        quality: "standard",
      });

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error("No image URL returned");
      }

      this.ensureOutputDir();
      
      const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const filename = `${id}.png`;
      const localPath = path.join(this.outputDir, filename);

      const imageResponse = await fetch(imageUrl);
      const buffer = await imageResponse.arrayBuffer();
      fs.writeFileSync(localPath, Buffer.from(buffer));

      const dimensions = size.split("x").map(Number);

      return {
        id,
        prompt,
        url: `/generated_images/${filename}`,
        localPath,
        width: dimensions[0],
        height: dimensions[1],
        createdAt: new Date(),
      };
    } catch (error: any) {
      console.error("[ImageGeneration] Error:", error.message);
      
      return this.generatePlaceholder(prompt, size);
    }
  }

  private generatePlaceholder(prompt: string, size: string): GeneratedImage {
    this.ensureOutputDir();
    
    const id = `placeholder_${Date.now()}`;
    const filename = `${id}.svg`;
    const localPath = path.join(this.outputDir, filename);
    
    const dimensions = size.split("x").map(Number);
    const width = dimensions[0];
    const height = dimensions[1];
    
    const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#22c55e", "#06b6d4"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${color}"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="24">
    ${prompt.substring(0, 20)}${prompt.length > 20 ? "..." : ""}
  </text>
</svg>`;

    fs.writeFileSync(localPath, svg);

    return {
      id,
      prompt,
      url: `/generated_images/${filename}`,
      localPath,
      width,
      height,
      createdAt: new Date(),
    };
  }

  async generateIcon(name: string, color?: string): Promise<GeneratedImage> {
    return this.generate({
      prompt: `${name} icon ${color ? `in ${color} color` : ""}`,
      style: "icon",
      size: "256x256",
    });
  }

  async generateLogo(companyName: string, style?: string): Promise<GeneratedImage> {
    return this.generate({
      prompt: `Logo for ${companyName} ${style ? `in ${style} style` : ""}`,
      style: "logo",
      size: "512x512",
    });
  }

  async generateUIElement(description: string): Promise<GeneratedImage> {
    return this.generate({
      prompt: description,
      style: "ui",
      size: "1024x1024",
    });
  }
}

export const imageGenerationService = new ImageGenerationService();
