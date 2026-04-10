/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, { width: 320, height: 480, themeColors: true });

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace("#", "");
  const bigint = parseInt(cleanHex, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return { r, g, b };
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "import") {
    try {
      const { items, projectName } = msg;
      
      // Load fonts
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      await figma.loadFontAsync({ family: "Inter", style: "Medium" });
      await figma.loadFontAsync({ family: "Inter", style: "Bold" });

      // Create main container frame
      const frame = figma.createFrame();
      frame.name = `${projectName} Moodboard`;
      frame.layoutMode = "VERTICAL";
      frame.paddingLeft = 40;
      frame.paddingRight = 40;
      frame.paddingTop = 60;
      frame.paddingBottom = 60;
      frame.itemSpacing = 40;
      frame.fills = [{ type: "SOLID", color: { r: 0.04, g: 0.04, b: 0.04 } }]; // #0a0a0a

      // Heading
      const title = figma.createText();
      title.characters = `${projectName}`;
      title.fontSize = 40;
      title.fontName = { family: "Inter", style: "Bold" };
      title.fills = [{ type: "SOLID", color: { r: 0.94, g: 0.93, b: 0.91 } }]; // #f0ede8
      frame.appendChild(title);

      // Grid container for images
      const grid = figma.createFrame();
      grid.name = "Grid";
      grid.layoutMode = "HORIZONTAL";
      grid.layoutWrap = "WRAP";
      grid.itemSpacing = 32;
      grid.counterAxisSpacing = 40;
      grid.fills = [];
      grid.layoutSizingHorizontal = "HUG";
      grid.layoutSizingVertical = "HUG";
      frame.appendChild(grid);

      let imported = 0;

      // Sequential generation to bypass Figma memory/network blocks on massive concurrent loads
      for (const item of items) {
        imported++;
        figma.ui.postMessage({ type: "progress", current: imported, total: items.length });

        try {
          const imgUrl = item.image_result.url;
          
          // Use fetch through the plugin env to bypass standard browser CORS where possible, 
          // though networkAccess domains are required.
          const response = await fetch(imgUrl);
          const arrayBuffer = await response.arrayBuffer();
          const imageData = new Uint8Array(arrayBuffer);
          const figmaImage = figma.createImage(imageData);

          // Card wrapper (Vertical stack)
          const cardGroup = figma.createFrame();
          cardGroup.name = item.image_result.title || "Image";
          cardGroup.layoutMode = "VERTICAL";
          cardGroup.itemSpacing = 12;
          cardGroup.fills = [];

          // Actual Image Frame
          const imgFrame = figma.createFrame();
          imgFrame.name = "Thumbnail";
          imgFrame.resize(340, 260);
          imgFrame.cornerRadius = 12;
          imgFrame.fills = [
            { type: "IMAGE", imageHash: figmaImage.hash, scaleMode: "FILL" }
          ];
          cardGroup.appendChild(imgFrame);

          // Tags row
          if (item.image_result.tags && item.image_result.tags.length > 0) {
            const tagsText = figma.createText();
            tagsText.characters = item.image_result.tags.slice(0, 5).join(" · ").toUpperCase();
            tagsText.fontSize = 11;
            tagsText.fontName = { family: "Inter", style: "Medium" };
            tagsText.fills = [{ type: "SOLID", color: { r: 0.96, g: 0.65, b: 0.14 } }]; // #f5a623
            cardGroup.appendChild(tagsText);
          }

          // Caption
          const captionStr = item.image_result.caption || item.image_result.title || "";
          if (captionStr) {
            const caption = figma.createText();
            caption.characters = captionStr;
            caption.fontSize = 13;
            caption.layoutSizingHorizontal = "FIXED";
            caption.resize(340, caption.height);
            caption.fills = [{ type: "SOLID", color: { r: 0.66, g: 0.64, b: 0.62 } }]; // #a8a29e
            cardGroup.appendChild(caption);
          }

          // Palette swatches
          if (item.image_result.color_palette && item.image_result.color_palette.length > 0) {
            const paletteRow = figma.createFrame();
            paletteRow.name = "Colors";
            paletteRow.layoutMode = "HORIZONTAL";
            paletteRow.itemSpacing = 8;
            paletteRow.fills = [];
            
            for (const hex of item.image_result.color_palette) {
              const swatch = figma.createRectangle();
              swatch.resize(20, 20);
              swatch.cornerRadius = 10;
              swatch.strokes = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: 0.1 }];
              swatch.fills = [{ type: "SOLID", color: hexToRgb(hex) }];
              paletteRow.appendChild(swatch);
            }
            cardGroup.appendChild(paletteRow);
          }

          // Notes
          if (item.notes) {
            const noteText = figma.createText();
            noteText.characters = `Note: ${item.notes}`;
            noteText.fontSize = 12;
            noteText.fontName = { family: "Inter", style: "Regular" };
            noteText.layoutSizingHorizontal = "FIXED";
            noteText.resize(340, noteText.height);
            noteText.fills = [{ type: "SOLID", color: { r: 0.94, g: 0.93, b: 0.91 } }];
            
            const noteFrame = figma.createFrame();
            noteFrame.layoutMode = "VERTICAL";
            noteFrame.paddingLeft = 12;
            noteFrame.paddingRight = 12;
            noteFrame.paddingTop = 10;
            noteFrame.paddingBottom = 10;
            noteFrame.cornerRadius = 8;
            noteFrame.fills = [{ type: "SOLID", color: { r: 0.15, g: 0.15, b: 0.15 } }];
            noteFrame.appendChild(noteText);
            
            cardGroup.appendChild(noteFrame);
          }
          
          grid.appendChild(cardGroup);

        } catch (imgErr) {
          console.error("Failed to load an image, skipping", imgErr);
        }
      }

      // Constrain grid to a reasonable width (max 4 columns approx)
      if (grid.children.length > 0) {
        grid.layoutSizingHorizontal = "FIXED";
        grid.resize(4 * 340 + 3 * 32, grid.height);
      }

      // Add to canvas and center
      figma.currentPage.appendChild(frame);
      figma.viewport.scrollAndZoomIntoView([frame]);

      figma.ui.postMessage({ type: "done" });
    } catch (e: any) {
      figma.ui.postMessage({ type: "error", message: e.message });
      console.error(e);
    }
  }
};
