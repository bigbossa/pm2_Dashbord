# ocr_service.py
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from PIL import Image
import io, json, os
from google.generativeai import configure, GenerativeModel
import uvicorn


# # ตั้งค่า API Key (ใช้วิธีใดวิธีหนึ่ง)
# # ✅ วิธีที่ 1: ใส่ตรงๆ (เหมาะกับทดสอบ)
configure(api_key="AIzaSyAJwtogT_u0uEjKHEDGZvZYAHhCULePvbw")
# configure(api_key="YOUR_GEMINI_API_KEY")

# configure(api_key=os.environ.get("GEMINI_API_KEY", "AIzaSyAJwtogT_u0uEjKHEDGZvZYAHhCULePvbw"))

app = FastAPI()
model = GenerativeModel("gemini-2.0-flash")

@app.post("/ocr")
async def ocr_image(file: UploadFile = File(...)):
  try:
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    prompt = "อ่านข้อความจากภาพและคืนค่าเป็น JSON"
    resp = model.generate_content([prompt, image])
    text = resp.text.strip().replace("```json", "").replace("```", "")

    try:
      data = json.loads(text)
    except:
      data = {"raw_text": text}

    return JSONResponse({"ok": True, "data": data})
  except Exception as e:
    return JSONResponse({"ok": False, "detail": str(e)}, status_code=500)
    
@app.post("/ocr/batch")
async def ocr_batch(files: list[UploadFile] = File(...)):
    results = {}
    for f in files:
        temp = f"tmp_{f.filename}"
        with open(temp, "wb") as out:
            out.write(await f.read())
        image = Image.open(temp)
        response = model.generate_content(["อ่านข้อความจากภาพและคืนค่าเป็น JSON", image])
        results[f.filename] = response.text
        os.remove(temp)
    return {"ok": True, "results": results}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)



# prompt = r"""
#       งานของคุณ: อ่านข้อมูลทั้งหมดจากภาพใบเสร็จ/ใบชั่งน้ำหนัก แล้วส่งออกเป็น **วัตถุ JSON เพียงอันเดียวเท่านั้น**
#       ห้ามมีข้อความอื่นใดนอกจาก JSON (ห้าม Markdown, ห้าม code fences)

#       กติกาเอาต์พุต (สำคัญมาก):
#       1) ใช้ชื่อคีย์ “ภาษาไทยตรงตามที่พิมพ์ในภาพ” ทุกคีย์ (เช่น ในภาพเขียนว่า "เลขที่" ให้ใช้คีย์ "เลขที่")
#         - ห้ามแปล/ย่อ/เปลี่ยนคำ/เพิ่มวงเล็บเอง
#         - ถ้าไม่มีคำนำหน้าหรือหัวตาราง ให้ **คงตามที่เห็น** หรือข้ามคีย์นั้นไป (ห้ามเดา)
#       2) ค่าตัวเลขให้คงรูป “ตามที่พิมพ์ในภาพ” (เช่น "19,150") เป็นสตริง
#         - เพิ่มคีย์สำเนาแบบตัวเลขล้วนให้ด้วย โดยเติมคำว่า " (ตัวเลข)" ต่อท้ายคีย์เดิม เช่น
#           "น้ำหนัก": "19,150", "น้ำหนัก (ตัวเลข)": 19150
#       3) วันที่/เวลา: คงรูปตามภาพเป็นสตริง, และถ้าอ่านได้ ให้เพิ่มคีย์ "(ISO)" เพิ่มอีกหนึ่งคีย์ เช่น
#         "วันที่": "01/11/2025", "วันที่ (ISO)": "2025-11-01"
#       4) ตัวอักษร/เว้นวรรค/วงเล็บ/ขีด/จุด ให้คงตามภาพเดิมทุกประการ
#       5) ถ้าไม่มีข้อมูล ให้ **ละคีย์นั้นไปเลย** (ห้ามใส่ค่าว่าง/เดา)
#       6) ส่วนที่เป็นรายการชั่ง “เข้า/ออก” ให้ทำเป็นอาเรย์ภายใต้คีย์ **"รายการชั่ง"** (คีย์นี้เป็นไทยตายตัว)
#         - ชื่อคอลัมน์ (คีย์ของแต่ละรายการ) ให้ใช้หัวตารางจากภาพตรง ๆ
#         - ถ้าไม่มีหัวตาราง ให้ใช้คีย์ทั่วไปต่อไปนี้แทน: "ประเภท", "ทะเบียนรถ", "วันที่", "เวลา", "น้ำหนัก"
#         - ทุกคีย์ตัวเลขในรายการ ให้มีคู่ "(ตัวเลข)" เช่น "น้ำหนัก (ตัวเลข)": 19150
#       7) หมายเหตุหลายบรรทัด ให้ส่งเป็นอาเรย์ของสตริงภายใต้คีย์ "หมายเหตุ"
#       8) ห้ามสร้างคีย์ภาษาอังกฤษขึ้นมาเอง (เช่น entries, type) ยกเว้น **"เมตาดาต้า"** ด้านล่าง
#       9) เพิ่มคีย์ "เมตาดาต้า" (คีย์ภาษาไทยตายตัว) ไว้ท้ายสุด เสมอ ด้วยรูปแบบ:
#         "เมตาดาต้า": {
#           "รูปแบบเอกสาร": "<ข้อความ>",       // เช่น "ใบชั่งน้ำหนัก", "ใบเสร็จ"
#           "ความเชื่อมั่น": <ตัวเลข 0..1>,     // ความมั่นใจภาพรวม
#           "ข้อสังเกต": [ ... ]                 // ถ้ามี เช่น ค่าที่อ่านไม่ชัด
#         }

#       รูปแบบโครงสร้าง JSON โดยสรุป (ตัวอย่างโครง สาธิต ไม่ใช่บังคับว่าต้องมีทุกคีย์):
#       {
#         "เลขที่": "0000008445",
#         "วันที่": "01/11/2025",
#         "วันที่ (ISO)": "2025-11-01",
#         "บริษัท/ผู้ออกเอกสาร": "ท่าทรายมิตรเจริญ",
#         "ที่อยู่": "61/3 หมู่1 ต.ท่าล้อ อ.ท่าม่วง จ.กาญจนบุรี 71110",
#         "ผู้รับ": "บริษัท ยงคอนกรีต จำกัด (มหาชน) (5)",
#         "สินค้า": "ทรายหยาบ (09)",
#         "ทะเบียนรถ": "70-9203-04",
#         "น้ำหนักสุทธิ": "27,400",
#         "น้ำหนักสุทธิ (ตัวเลข)": 27400,
#         "รายการชั่ง": [
#           {
#             "ประเภท": "เข้า",
#             "วันที่": "01/11/2025",
#             "เวลา": "12:17:58",
#             "ทะเบียนรถ": "70-9203-04",
#             "น้ำหนัก": "19,150",
#             "น้ำหนัก (ตัวเลข)": 19150
#           },
#           {
#             "ประเภท": "ออก",
#             "วันที่": "01/11/2025",
#             "เวลา": "12:24:43",
#             "ทะเบียนรถ": "70-9203-04",
#             "น้ำหนัก": "46,550",
#             "น้ำหนัก (ตัวเลข)": 46550
#           }
#         ],
#         "หมายเหตุ": ["...","..."],
#         "เมตาดาต้า": {
#           "รูปแบบเอกสาร": "ใบชั่งน้ำหนัก",
#           "ความเชื่อมั่น": 0.92,
#           "ข้อสังเกต": []
#         }
#       }

#       จำไว้อีกครั้ง: ให้ส่ง **เฉพาะวัตถุ JSON** ตามกติกาข้างต้น ไม่มีคำอธิบาย ไม่มีโค้ดบล็อก ไม่มีข้อความอื่น
#       """



# @app.post("/ocr")
# async def ocr_image(file: UploadFile = File(...)):
#     try:
#         contents = await file.read()
#         image = Image.open(io.BytesIO(contents))

#         # ✅ ใช้ prompt ที่ชัดเจน
#         resp = model.generate_content([prompt, image])
#         text = resp.text.strip().replace("```json", "").replace("```", "")

#         # ✅ พยายาม parse เป็น JSON ก่อน ถ้าไม่สำเร็จเก็บ raw text
#         try:
#             data = json.loads(text)
#         except json.JSONDecodeError:
#             data = {"raw_text": text}

#         return JSONResponse({"ok": True, "data": data})
#     except Exception as e:
#         return JSONResponse({"ok": False, "detail": str(e)}, status_code=500)

    
# @app.post("/ocr/batch")
# async def ocr_batch(files: list[UploadFile] = File(...)):
#     results = {}
#     for f in files:
#         temp = f"tmp_{f.filename}"
#         with open(temp, "wb") as out:
#             out.write(await f.read())
#         image = Image.open(temp)
#         response = model.generate_content(["อ่านข้อความจากภาพและคืนค่าเป็น JSON", image])
#         results[f.filename] = response.text
#         os.remove(temp)
#     return {"ok": True, "results": results}


# if __name__ == "__main__":
#     uvicorn.run(app, host="0.0.0.0", port=8000)