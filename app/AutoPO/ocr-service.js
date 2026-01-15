// ocr-service.js - Google Gemini OCR Service (JavaScript)
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs').promises;
const path = require('path');

// ตั้งค่า API Key
const GEMINI_API_KEY = "AIzaSyA0MjR26AH2EkHIKLJwUYHUx9UFvAYreI0";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ⚠️ หมายเหตุ: API Key นี้หมด quota แล้ว
// ต้องไปสร้าง API Key ใหม่ที่: https://aistudio.google.com/app/apikey

/**
 * อ่านเลขไมล์จากภาพด้วย Gemini Vision API (อ่านเฉพาะตัวเลข)
 * @param {string} imagePath - พาธของไฟล์ภาพไมล์
 * @param {string} tag - ประเภทข้อมูล (mile_start, mile_end)
 * @returns {Promise<Object>} - ผลลัพธ์ OCR ที่มีเฉพาะตัวเลขไมล์
 */
async function processOCR(imagePath, tag = 'unknown') {
  try {
    console.log(`🔍 [processOCR] อ่านเลขไมล์: ${imagePath} (tag: ${tag})`);
    
    // อ่านไฟล์ภาพ
    const imageData = await fs.readFile(imagePath);
    const base64Image = imageData.toString('base64');
    
    // เลือก model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Prompt สำหรับอ่านเลขไมล์เท่านั้น
    const prompt = `อ่านตัวเลขไมล์รถยนต์จากภาพนี้

กฎสำคัญ:
1. ตอบเป็นตัวเลขอย่างเดียว ห้ามมีอักษร ห้ามมีคำอธิบาย
2. ให้อ่านตัวเลขทั้งหมดที่เห็น รวมถึง leading zeros (เช่น 00125847)
3. ถ้ามี leading zero ห้ามตัดทิ้ง ต้องเก็บไว้ครบทุกหลัก
4. ห้ามใส่เครื่องหมายจุลภาค หรือช่องว่าง
5. ตอบแค่ตัวเลขเท่านั้น

ตัวอย่าง:
- ถ้าเห็น 00125847 ให้ตอบ: 00125847
- ถ้าเห็น 0542136 ให้ตอบ: 0542136
- ถ้าเห็น 125847 ให้ตอบ: 125847

ตอบแค่ตัวเลข:`;
    
    // เรียก Gemini API
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg'
        }
      }
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    console.log('='.repeat(80));
    console.log(`📊 [processOCR] Response from Gemini (tag: ${tag}):`);
    console.log(text);
    console.log('='.repeat(80));
    
    // Parse response - สำหรับไมล์: อ่านเฉพาะตัวเลข
    const cleanText = text.trim()
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/[^\d]/g, '') // เอาแต่ตัวเลข
      .trim();
    
    const data = {
      odometer: cleanText,
      raw_text: text
    };
    
    console.log(`✅ [processOCR] Parsed odometer: ${cleanText}`);
    
    return {
      ok: true,
      data: data,
      meta: {
        tag: tag,
        model: "gemini-2.0-flash",
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('===================== OCR Error =====================');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', JSON.stringify(error, null, 2));
    console.error('====================================================');
    
    return {
      ok: false,
      error: error.message || 'Unknown error',
      detail: `ไม่สามารถอ่านภาพได้: ${error.message || error.toString()}`,
      errorName: error.name,
      errorStack: error.stack
    };
  }
}

/**
 * แปลงผลลัพธ์จาก Gemini ให้เป็นรูปแบบที่ frontend ต้องการ
 */
function normalizeOCRResult(geminiData, tag) {
  const result = {
    fields: {},
    raw: geminiData
  };
  
  // สำหรับไมล์
  if (tag === 'mile_start' || tag === 'mile_end') {
    const odometer = geminiData.odometer || 
                     geminiData.mileage || 
                     geminiData.mile || 
                     geminiData.value;
    
    if (odometer) {
      result.fields[tag] = String(odometer); // เก็บเป็น string เพื่อรักษา leading zeros
    }
  }
  
  // สำหรับน้ำหนัก
  else if (tag === 'wt_origin' || tag === 'wt_dest') {
    const entries = geminiData.entries || [];
    
    for (const entry of entries) {
      const type = String(entry.type || '').toLowerCase();
      const weight = entry.weight || entry.value;
      
      if (tag === 'wt_origin') {
        if (type.includes('in') || type.includes('เข้า')) {
          result.fields.wt_before_pick = Number(weight);
        } else if (type.includes('out') || type.includes('ออก')) {
          result.fields.wt_after_pick = Number(weight);
        }
      } else if (tag === 'wt_dest') {
        if (type.includes('in') || type.includes('เข้า') || type.includes('arrive')) {
          result.fields.wt_arrive_dest = Number(weight);
        } else if (type.includes('out') || type.includes('ออก') || type.includes('leave')) {
          result.fields.wt_leave_dest = Number(weight);
        }
      }
    }
  }
  
  return result;
}

/**
 * OCR เฉพาะสำหรับอ่านใบชั่งน้ำหนัก (Weight Scale Ticket)
 * มีความละเอียดและแม่นยำมากกว่า processOCR ทั่วไป
 * 
 * @param {string} imagePath - พาธของไฟล์ภาพใบชั่ง
 * @param {string} context - บริบท: 'origin' (ต้นทาง) หรือ 'destination' (ปลายทาง)
 * @returns {Promise<Object>} - ผลลัพธ์ที่มีโครงสร้างชัดเจน
 */
async function processWeightScaleOCR(imagePath, context = 'origin') {
  try {
    console.log(`📋 [processWeightScaleOCR] อ่านใบชั่ง: ${imagePath} (context: ${context})`);
    
    // อ่านไฟล์ภาพ
    const imageData = await fs.readFile(imagePath);
    const base64Image = imageData.toString('base64');
    
    // เลือก model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Prompt เฉพาะสำหรับใบชั่งน้ำหนัก (7 ฟิลด์)
    const prompt = `อ่านใบชั่งน้ำหนักภาษาไทยและตอบเป็น JSON ที่มี 7 ฟิลด์นี้:

1. ticket_number - หา "เลขที่" แล้วเอาตัวเลขที่อยู่หลังมา (เก็บ leading zeros)
2. vehicle_plate - หา "ทะเบียนรถ" ในตาราง เอาค่าแบบ "70-9203-04"
3. weight_entry - หาแถว "เข้า" ในตาราง เอาตัวเลขน้ำหนัก (เอาเครื่องหมายคอมม่าออก)
4. weight_exit - หาแถว "ออก" ในตาราง เอาตัวเลขน้ำหนัก (เอาเครื่องหมายคอมม่าออก)
5. remark1 - หา "หมายเหตุ 1" หรือ "หมายเหตุท 1" เอาข้อความหลังมา
6. remark2 - หา "หมายเหตุ 2" หรือ "หมายเหตุท 2" เอาข้อความหลังมา
7. remark3 - หา "หมายเหตุ 3" หรือ "หมายเหตุท 3" เอาข้อความหลังมา

ตอบแค่ JSON นี้เท่านั้น (ห้ามมี markdown ห้ามมีคำอธิบาย):
{
  "ticket_number": "string",
  "vehicle_plate": "string or null",
  "weight_entry": number,
  "weight_exit": number,
  "remark1": "string or null",
  "remark2": "string or null",
  "remark3": "string or null",
  "raw_text": "ข้อความทั้งหมดที่เห็น"
}`;


    // เรียก Gemini API
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg'
        }
      }
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    // 📋 Log response from Gemini
    console.log('='.repeat(80));
    console.log(`📋 [processWeightScaleOCR] RAW RESPONSE FROM GEMINI (${context}):`);
    console.log(text);
    console.log('='.repeat(80));
    
    // Parse JSON response
    let parsedData;
    try {
      const cleanText = text.trim()
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsedData = JSON.parse(cleanText);
      
      // 🔍 Normalize: ถ้า response ไม่มี ticket_number แต่มี entries แบบเก่า
      // ให้ extract ticket_number จาก raw_text หรือ raw_data หรือ text ดิบ
      if (!parsedData.ticket_number) {
        // ลองหาจาก 3 ที่: parsedData, text ดิบจาก Gemini, และชื่อไฟล์
        const sources = [
          parsedData.raw_text || '',
          parsedData.raw_data || '',
          text || '',
          path.basename(imagePath) // ดึงจากชื่อไฟล์ด้วย (เผื่อมีเลขที่อยู่ในชื่อ)
        ];
        
        for (const rawText of sources) {
          if (!rawText) continue;
          
          // หาเลขที่จาก raw text - เอาตัวเลขทั้งหมดที่อยู่หลังคำว่า "เลขที่" (ไม่จำกัดจำนวนหลัก)
          const ticketMatch = rawText.match(/(?:เลขที่|No\.?|Ticket|#)\s*[:\-]?\s*(\d+)/i);
          if (ticketMatch) {
            parsedData.ticket_number = ticketMatch[1];
            console.log(`✅ Found ticket_number from source: ${ticketMatch[1]}`);
            break;
          }
        }
        
        // ถ้ายังไม่เจอ ลองหาตัวเลข 8-10 หลักที่อยู่ต้นสุด (มักเป็นเลขที่)
        if (!parsedData.ticket_number) {
          for (const rawText of sources) {
            if (!rawText) continue;
            const longNumberMatch = rawText.match(/\b(\d{8,10})\b/);
            if (longNumberMatch) {
              parsedData.ticket_number = longNumberMatch[1];
              console.log(`✅ Found ticket_number (8-10 digits): ${longNumberMatch[1]}`);
              break;
            }
          }
        }
      }
      
      // 🔍 Normalize: ถ้ามี entries แทน weight_entry/weight_exit ให้แปลง
      if (!parsedData.weight_entry && Array.isArray(parsedData.entries)) {
        const entryIn = parsedData.entries.find(e => 
          String(e.type).toLowerCase().includes('in') || 
          String(e.type).toLowerCase().includes('เข้า')
        );
        const entryOut = parsedData.entries.find(e => 
          String(e.type).toLowerCase().includes('out') || 
          String(e.type).toLowerCase().includes('ออก')
        );
        
        if (entryIn) parsedData.weight_entry = Number(entryIn.weight);
        if (entryOut) parsedData.weight_exit = Number(entryOut.weight);
      }
      
    } catch (parseError) {
      console.warn('Weight Scale OCR: Parse error, trying to extract data:', parseError.message);
      // พยายามหาตัวเลขจาก raw text
      const numbers = text.match(/\d{3,}/g) || [];
      parsedData = {
        weights: numbers.map((num, idx) => ({
          type: idx === 0 ? 'entry' : 'exit',
          value: parseInt(num.replace(/,/g, ''), 10),
          unit: 'kg'
        })),
        raw_text: text
      };
    }
    
    console.log('📋 Parsed data after normalization:', JSON.stringify(parsedData, null, 2));
    
    // ปรับปรุงข้อมูล
    const normalizedWeights = normalizeWeightData(parsedData, context);
    
    return {
      ok: true,
      data: parsedData,
      normalized: normalizedWeights,
      meta: {
        context: context,
        model: "gemini-2.0-flash-weight-specialized",
        timestamp: new Date().toISOString(),
        imagePath: path.basename(imagePath)
      }
    };
    
  } catch (error) {
    console.error('========= Weight Scale OCR Error =========');
    console.error('Context:', context);
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('==========================================');
    
    return {
      ok: false,
      error: error.message || 'Unknown error',
      detail: `ไม่สามารถอ่านใบชั่งน้ำหนักได้: ${error.message}`,
      context: context
    };
  }
}

/**
 * แปลงข้อมูลน้ำหนักจากใบชั่งให้อยู่ในรูปแบบที่ใช้งานง่าย
 */
function normalizeWeightData(weightScaleData, context) {
  const result = {
    entry_weight: null,    // น้ำหนักเข้า (รถเต็ม)
    exit_weight: null,     // น้ำหนักออก (รถเปล่า)
    net_weight: null,      // น้ำหนักสุทธิ (สินค้า)
    unit: 'kg',
    ticket_info: {
      number: weightScaleData.ticket_number || null,
      vehicle: weightScaleData.vehicle_plate || null,
      date: weightScaleData.date || null,
      time: weightScaleData.time || null
    }
  };
  
  // ⭐ รองรับทั้ง weight_entry/weight_exit และ entries array
  if (weightScaleData.weight_entry) {
    result.entry_weight = Number(weightScaleData.weight_entry);
  }
  if (weightScaleData.weight_exit) {
    result.exit_weight = Number(weightScaleData.weight_exit);
  }
  
  // แยกน้ำหนักตามประเภท จาก weights หรือ entries array
  const weights = weightScaleData.weights || weightScaleData.entries || [];
  
  for (const w of weights) {
    const type = String(w.type || '').toLowerCase();
    const value = Number(w.value || w.weight); // รองรับทั้ง value และ weight
    
    if (isNaN(value)) continue;
    
    // แปลง unit ถ้าเป็นตัน
    const finalValue = (w.unit === 'ton') ? value * 1000 : value;
    
    if (type.includes('entry') || type.includes('gross') || type.includes('in') || type.includes('เข้า')) {
      if (!result.entry_weight) result.entry_weight = finalValue;
    } else if (type.includes('exit') || type.includes('tare') || type.includes('out') || type.includes('ออก')) {
      if (!result.exit_weight) result.exit_weight = finalValue;
    } else if (type.includes('net') || type.includes('สุทธิ')) {
      result.net_weight = finalValue;
    }
  }
  
  // คำนวณน้ำหนักสุทธิถ้ายังไม่มี
  if (result.entry_weight && result.exit_weight && !result.net_weight) {
    result.net_weight = Math.abs(result.entry_weight - result.exit_weight);
  }
  
  // แมปกับ field ของระบบตาม context
  const fields = {};
  
  // ⭐ เพิ่ม ticket_number เข้าไปใน fields (สำคัญมาก!)
  if (weightScaleData.ticket_number) {
    fields.ticket_number = weightScaleData.ticket_number;
  }
  
  // ⭐ เพิ่ม vehicle_plate ด้วย (ถ้ามี)
  if (weightScaleData.vehicle_plate) {
    fields.vehicle_plate = weightScaleData.vehicle_plate;
  }
  
  if (context === 'origin') {
    // ต้นทาง: wt_before_pick (เข้า), wt_after_pick (ออก)
    if (result.entry_weight) fields.wt_before_pick = result.entry_weight;
    if (result.exit_weight) fields.wt_after_pick = result.exit_weight;
  } else if (context === 'destination') {
    // ปลายทาง: wt_arrive_dest (เข้า), wt_leave_dest (ออก)
    if (result.entry_weight) fields.wt_arrive_dest = result.entry_weight;
    if (result.exit_weight) fields.wt_leave_dest = result.exit_weight;
  }
  
  result.fields = fields;
  
  return result;
}

module.exports = {
  processOCR,
  normalizeOCRResult,
  processWeightScaleOCR,      // ⭐ ฟังก์ชันใหม่สำหรับใบชั่ง
  normalizeWeightData          // ⭐ Helper สำหรับแปลงข้อมูลน้ำหนัก
};
