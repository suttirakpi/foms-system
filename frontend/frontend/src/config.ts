// ศูนย์กลาง config ของ frontend — ถ้าจะเปลี่ยนพอร์ต/โดเมน backend แก้ที่ .env ที่เดียว
export const API_URL: string =
  import.meta.env.VITE_API_URL || "http://localhost:5000";
