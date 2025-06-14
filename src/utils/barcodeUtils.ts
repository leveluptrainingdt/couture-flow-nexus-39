
interface BarcodeResponse {
  secure_url: string;
}

export const generateBarcode = async (text: string): Promise<string> => {
  try {
    // Generate barcode using Code128 format with Cloudinary
    const barcodeUrl = `https://res.cloudinary.com/dvmrhs2ek/image/upload/c_scale,w_200/l_text:Arial_20:${encodeURIComponent(text)}/fl_layer_apply,g_south,y_10/v1/barcode_base.png`;
    
    // Alternative: Use a barcode generation service
    const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=200x50&data=${encodeURIComponent(text)}&format=png&barcode=true&type=code128`);
    
    if (response.ok) {
      return response.url;
    }
    
    // Fallback to simple text-based barcode
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="200" height="50" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="50" fill="white"/>
        <g fill="black">
          ${generateCode128Bars(text)}
        </g>
        <text x="100" y="45" text-anchor="middle" font-family="monospace" font-size="8">${text}</text>
      </svg>
    `)}`;
  } catch (error) {
    console.error('Error generating barcode:', error);
    // Return a simple text-based fallback
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="200" height="50" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="50" fill="white" stroke="black"/>
        <text x="100" y="30" text-anchor="middle" font-family="monospace" font-size="12">${text}</text>
      </svg>
    `)}`;
  }
};

const generateCode128Bars = (text: string): string => {
  // Simplified Code128 pattern generation
  const bars = [];
  let x = 10;
  
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    const pattern = char % 2 === 0 ? [2, 1, 2, 1] : [1, 2, 1, 2];
    
    for (let j = 0; j < pattern.length; j++) {
      if (j % 2 === 0) {
        bars.push(`<rect x="${x}" y="5" width="${pattern[j]}" height="30"/>`);
      }
      x += pattern[j];
    }
  }
  
  return bars.join('');
};

export const validateBarcodeText = (text: string): boolean => {
  // Basic validation for barcode text
  return text.length > 0 && text.length <= 50 && /^[A-Za-z0-9\-_]+$/.test(text);
};
