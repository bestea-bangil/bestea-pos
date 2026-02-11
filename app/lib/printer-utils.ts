export const ECS_POS = {
  RESET: "\x1B\x40",
  ALIGN_LEFT: "\x1B\x61\x00",
  ALIGN_CENTER: "\x1B\x61\x01",
  ALIGN_RIGHT: "\x1B\x61\x02",
  BOLD_ON: "\x1B\x45\x01",
  BOLD_OFF: "\x1B\x45\x00",
  TEXT_NORMAL: "\x1D\x21\x00",
  TEXT_DOUBLE_HEIGHT: "\x1D\x21\x01",
  TEXT_DOUBLE_WIDTH: "\x1D\x21\x10",
  TEXT_DOUBLE: "\x1D\x21\x11",
  CUT: "\x1D\x56\x41\x00",
};

export interface PrinterConfig {
  paperWidth: "58mm" | "80mm";
  charsPerLine?: number;
  chunkSize?: number;
}

export class PrinterEncoder {
  private buffer: number[] = [];
  private encoder = new TextEncoder();
  private config: PrinterConfig;

  constructor(config: PrinterConfig = { paperWidth: "58mm" }) {
    this.config = config;
    if (!this.config.charsPerLine) {
       this.config.charsPerLine = this.config.paperWidth === "80mm" ? 48 : 32;
    }
    this.reset();
  }

  reset() {
    this.buffer = [];
    this.addCommand(ECS_POS.RESET);
  }

  private addCommand(command: string) {
    for (let i = 0; i < command.length; i++) {
      this.buffer.push(command.charCodeAt(i));
    }
  }

  text(text: string) {
    const encoded = this.encoder.encode(text);
    encoded.forEach((byte) => this.buffer.push(byte));
  }

  newline(count = 1) {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0x0a);
    }
  }

  line(text: string) {
    this.text(text);
    this.newline();
  }

  separator(char = "-") {
    const width = this.config.charsPerLine || 32;
    this.line(char.repeat(width));
  }

  row(left: string, right: string) {
    const width = this.config.charsPerLine || 32;
    const leftLen = left.length;
    const rightLen = right.length;
    // Ensure we have at least 1 space
    const spaceLen = Math.max(1, width - leftLen - rightLen);
    
    this.text(left);
    this.text(" ".repeat(spaceLen));
    this.line(right);
  }

  align(alignment: "left" | "center" | "right") {
    switch (alignment) {
      case "left":
        this.addCommand(ECS_POS.ALIGN_LEFT);
        break;
      case "center":
        this.addCommand(ECS_POS.ALIGN_CENTER);
        break;
      case "right":
        this.addCommand(ECS_POS.ALIGN_RIGHT);
        break;
    }
  }

  bold(enabled: boolean) {
    this.addCommand(enabled ? ECS_POS.BOLD_ON : ECS_POS.BOLD_OFF);
  }

  size(size: "normal" | "large") {
    this.addCommand(size === "large" ? ECS_POS.TEXT_DOUBLE : ECS_POS.TEXT_NORMAL);
  }

  cut() {
    this.newline(3); // Feed paper a bit before cutting
    this.addCommand(ECS_POS.CUT);
  }

  raw(data: Uint8Array | number[]) {
    if (Array.isArray(data)) {
      data.forEach((byte) => this.buffer.push(byte));
    } else {
      data.forEach((byte) => this.buffer.push(byte));
    }
  }

  encode(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

// Image Processing Helpers
export async function processLogo(
  imgSrc: string,
  maxWidth: number = 384, // 58mm printer usually 384 dots width
): Promise<Uint8Array | null> {
  if (typeof window === "undefined") return null;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imgSrc;

    img.onload = () => {
      // Create canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to create canvas context"));
        return;
      }

      // Calculate dimensions (maintain aspect ratio)
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      // Round width to nearest multiple of 8 for byte alignment
      width = Math.ceil(width / 8) * 8;

      canvas.width = width;
      canvas.height = height;

      // Draw image (white background)
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Convert to bitmap (GS v 0)
      // Command: GS v 0 m xL xH yL yH d1...dk
      // m = 0 (normal), xL, xH = width in bytes, yL, yH = height in dots
      const xL = (width / 8) % 256;
      const xH = Math.floor(width / 8 / 256);
      const yL = height % 256;
      const yH = Math.floor(height / 256);

      const header = [0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH];
      const rasterData: number[] = [];

      // Process pixels
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x += 8) {
          let byte = 0;
          for (let b = 0; b < 8; b++) {
            if (x + b < width) {
              const offset = (y * width + (x + b)) * 4;
              const r = data[offset];
              const g = data[offset + 1];
              const b_val = data[offset + 2];
              const a = data[offset + 3];

              // Simple thresholding
              // If pixel is transparent or bright, it's white (0 for printer usually, but GS v 0 treats 1 as print dot, 0 as valid space? Verify.)
              // ESC/POS GS v 0: 1 = print dot (black), 0 = white.
              // Logic: lighter = 0, darker = 1.
              // Luminance: 0.299R + 0.587G + 0.114B
              const luminance = 0.299 * r + 0.587 * g + 0.114 * b_val;
              
              // If opaque and dark enough -> bit 1. 
              if (a > 128 && luminance < 128) {
                byte |= 1 << (7 - b);
              }
            }
          }
          rasterData.push(byte);
        }
      }

      // Combine header and data
      const finalData = new Uint8Array([...header, ...rasterData]);
      resolve(finalData);
    };

    img.onerror = (err) => reject(err);
  });
}