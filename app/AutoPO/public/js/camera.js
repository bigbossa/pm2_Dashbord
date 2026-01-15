// camera.js - จัดการการเปิดกล้องและถ่ายรูป

class CameraHandler {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.canvasElement = null;
  }

  /**
   * เปิดกล้อง
   * @param {HTMLVideoElement} videoElement - element video สำหรับแสดงภาพจากกล้อง
   * @param {Object} options - ตัวเลือก เช่น { facingMode: 'environment' } สำหรับกล้องหลัง
   */
  async openCamera(videoElement, options = {}) {
    try {
      this.videoElement = videoElement;
      
      const constraints = {
        video: {
          facingMode: options.facingMode || 'environment', // 'user' = กล้องหน้า, 'environment' = กล้องหลัง
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();
      
      return { ok: true, message: 'เปิดกล้องสำเร็จ' };
    } catch (error) {
      console.error('Error opening camera:', error);
      
      let errorMessage = 'ไม่สามารถเปิดกล้องได้';
      let errorDetail = '';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'กรุณาอนุญาตการใช้งานกล้อง';
        errorDetail = '• อนุญาตสิทธิ์การใช้กล้องสำหรับเว็บไซต์นี้\n• รีเฟรชหน้าเว็บ';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'ไม่พบกล้อง';
        errorDetail = '• ตรวจสอบว่าอุปกรณ์มีกล้อง';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'กล้องไม่สามารถใช้งานได้';
        errorDetail = '• กล้องอาจถูกใช้งานโดยแอปอื่น\n• รีสตาร์ทเบราว์เซอร์หรืออุปกรณ์';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'กล้องไม่รองรับการตั้งค่าที่ต้องการ';
        errorDetail = '• รีเฟรชหน้าเว็บ';
      } else if (error.name === 'TypeError') {
        errorMessage = 'เบราว์เซอร์ไม่รองรับการใช้งานกล้อง';
        errorDetail = '• ใช้เบราว์เซอร์ Chrome หรือ Safari';
      }
      
      const fullMessage = errorDetail ? `${errorMessage}\n\n${errorDetail}` : errorMessage;
      
      return { 
        ok: false, 
        message: fullMessage,
        error: error.name
      };
    }
  }

  /**
   * ถ่ายรูป
   * @param {HTMLCanvasElement} canvasElement - canvas สำหรับวาดภาพ (optional)
   * @returns {String} Base64 image data
   */
  capturePhoto(canvasElement = null) {
    if (!this.videoElement) {
      throw new Error('กรุณาเปิดกล้องก่อน');
    }

    const canvas = canvasElement || document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    
    context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
    
    // คืนค่าเป็น base64
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  /**
   * ถ่ายรูปพร้อม crop ตามกรอบโฟกัส (เต็มกรอบ)
   * @param {Number} x - ตำแหน่ง x เริ่มต้น
   * @param {Number} y - ตำแหน่ง y เริ่มต้น
   * @param {Number} width - ความกว้างของกรอบ
   * @param {Number} height - ความสูงของกรอบ
   * @param {Number} outputWidth - ความกว้างของภาพที่ต้องการ (optional)
   * @param {Number} outputHeight - ความสูงของภาพที่ต้องการ (optional)
   * @returns {String} Base64 image data (cropped)
   */
  capturePhotoWithCrop(x, y, width, height, outputWidth = null, outputHeight = null) {
    if (!this.videoElement) {
      throw new Error('กรุณาเปิดกล้องก่อน');
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // ถ้าไม่ระบุ output size ให้ใช้ขนาดเดียวกับที่ crop
    const finalWidth = outputWidth || width;
    const finalHeight = outputHeight || height;
    
    // ตั้งขนาด canvas ตามขนาดที่ต้องการ
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    
    // เปิด image smoothing เพื่อคุณภาพดีขึ้น
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    
    // วาดภาพจาก video ให้เต็มกรอบ canvas
    // ภาพจะถูก scale ให้พอดีกับ canvas
    context.drawImage(
      this.videoElement,
      x, y, width, height,           // บริเวณที่ต้องการตัดจาก video
      0, 0, finalWidth, finalHeight  // วาดให้เต็ม canvas
    );
    
    // คืนค่าเป็น base64 คุณภาพสูง
    return canvas.toDataURL('image/jpeg', 0.95);
  }

  /**
   * ปิดกล้อง
   */
  closeCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  /**
   * แปลง base64 เป็น Blob สำหรับอัปโหลด
   * @param {String} base64Data - ข้อมูลภาพ base64
   * @param {String} contentType - ประเภทไฟล์ (default: image/jpeg)
   * @returns {Blob}
   */
  base64ToBlob(base64Data, contentType = 'image/jpeg') {
    const base64 = base64Data.split(',')[1];
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }

  /**
   * อัปโหลดรูปภาพไปยัง server
   * @param {String} base64Data - ข้อมูลภาพ base64
   * @param {String} fieldName - ชื่อ field สำหรับอัปโหลด
   * @param {Object} additionalData - ข้อมูลเพิ่มเติม เช่น rec_id
   * @returns {Promise}
   */
  async uploadPhoto(base64Data, fieldName, additionalData = {}) {
    try {
      const blob = this.base64ToBlob(base64Data);
      const formData = new FormData();
      
      // สร้างชื่อไฟล์
      const timestamp = Date.now();
      const filename = `${fieldName}_${timestamp}.jpg`;
      formData.append(fieldName, blob, filename);
      
      // เพิ่มข้อมูลอื่นๆ
      for (const [key, value] of Object.entries(additionalData)) {
        formData.append(key, value);
      }

      const response = await fetch('api/upload-images', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      return { ok: false, detail: error.message };
    }
  }

  /**
   * สลับกล้อง (หน้า/หลัง)
   */
  async switchCamera() {
    const currentFacingMode = this.stream?.getVideoTracks()[0]?.getSettings()?.facingMode;
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    
    this.closeCamera();
    return await this.openCamera(this.videoElement, { facingMode: newFacingMode });
  }
}

// ส่งออกเพื่อใช้งาน
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CameraHandler;
}
