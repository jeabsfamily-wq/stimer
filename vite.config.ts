import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// บน Render ให้เสิร์ฟจากรากโดเมน
export default defineConfig({
  plugins: [react()],
  base: '/',   // ← ตรงนี้
})
