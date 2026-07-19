/**
 * photoUtils.ts — 本地照片处理：读取 + 画布重编码。
 * 经 canvas 重编码后输出的 JPEG 不携带 EXIF（方向、定位等元数据被丢弃），
 * 全程在浏览器本地完成，照片不上传。
 */

/** File → 去除 EXIF 的 JPEG dataURL（最长边限制 1280，控制体积） */
export function fileToCleanDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('读取文件失败'));
        return;
      }
      reencodeDataUrl(reader.result).then(resolve, reject);
    };
    reader.readAsDataURL(file);
  });
}

/** dataURL → 画布重编码的 JPEG dataURL（剥离元数据） */
export function reencodeDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('解析图片失败'));
    img.onload = () => {
      const MAX = 1280;
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight, 1));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('画布不可用'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.src = dataUrl;
  });
}

/** 校验文件是否为常见图片类型 */
export function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|gif|bmp|avif|heic)$/i.test(file.name);
}
