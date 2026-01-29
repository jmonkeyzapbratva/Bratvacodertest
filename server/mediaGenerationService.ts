import OpenAI from "openai";
import fs from "fs";
import path from "path";

interface GeneratedImage {
  url: string;
  localPath?: string;
  prompt: string;
  size: string;
  createdAt: string;
}

interface GeneratedVideo {
  url: string;
  localPath?: string;
  prompt: string;
  duration: number;
  createdAt: string;
}

class MediaGenerationService {
  private openai: OpenAI | null = null;
  private outputDir = "generated_media";

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generateImage(
    prompt: string,
    options: {
      size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792";
      style?: "vivid" | "natural";
      quality?: "standard" | "hd";
    } = {}
  ): Promise<GeneratedImage> {
    if (!this.openai) {
      return this.generatePlaceholderImage(prompt, options.size || "512x512");
    }

    try {
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: options.size || "1024x1024",
        style: options.style || "vivid",
        quality: options.quality || "standard",
      });

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error("Nenhuma imagem gerada");
      }

      const localPath = await this.downloadImage(imageUrl, prompt);

      return {
        url: imageUrl,
        localPath,
        prompt,
        size: options.size || "1024x1024",
        createdAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("[MediaGeneration] Error generating image:", error);
      return this.generatePlaceholderImage(prompt, options.size || "512x512");
    }
  }

  private async downloadImage(url: string, prompt: string): Promise<string> {
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      
      const filename = `image_${Date.now()}_${prompt.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      const filepath = path.join(this.outputDir, filename);
      
      fs.writeFileSync(filepath, Buffer.from(buffer));
      
      return filepath;
    } catch (error) {
      console.error("[MediaGeneration] Error downloading image:", error);
      return "";
    }
  }

  private generatePlaceholderImage(prompt: string, size: string): GeneratedImage {
    const [width, height] = size.split("x").map(Number);
    
    const placeholderUrl = `https://via.placeholder.com/${width}x${height}/1a1b26/a9b1d6?text=${encodeURIComponent(prompt.slice(0, 30))}`;
    
    return {
      url: placeholderUrl,
      prompt,
      size,
      createdAt: new Date().toISOString(),
    };
  }

  async generateVideo(
    prompt: string,
    options: {
      duration?: number;
      aspectRatio?: "16:9" | "9:16" | "1:1";
    } = {}
  ): Promise<GeneratedVideo> {
    console.log("[MediaGeneration] Video generation requested:", prompt);
    
    return {
      url: `https://via.placeholder.com/1920x1080/1a1b26/a9b1d6?text=${encodeURIComponent("Video: " + prompt.slice(0, 20))}`,
      prompt,
      duration: options.duration || 5,
      createdAt: new Date().toISOString(),
    };
  }

  async generateIcon(
    name: string,
    style: "minimal" | "flat" | "3d" = "minimal"
  ): Promise<GeneratedImage> {
    const prompt = `Simple ${style} icon for "${name}", clean design, transparent background, vector style`;
    return this.generateImage(prompt, { size: "256x256", style: "natural" });
  }

  async generateLogo(
    brandName: string,
    style: string = "modern"
  ): Promise<GeneratedImage> {
    const prompt = `${style} logo design for "${brandName}", professional, clean, memorable`;
    return this.generateImage(prompt, { size: "512x512", style: "natural" });
  }
}

export const mediaGenerationService = new MediaGenerationService();
