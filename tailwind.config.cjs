// tailwind.config.cjs
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'], // ✅ ใช้ Inter
      },
      colors: {
        brand: {
          DEFAULT: '#6366F1', // Indigo-500 (โทน modern)
          dark: '#4F46E5',    // Indigo-600
          light: '#A5B4FC',   // Indigo-300
        },
      },
      borderRadius: {
        xl: '1rem',    // ปุ่ม / card มุมโค้งใหญ่ขึ้น
        '2xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 4px 12px rgba(0,0,0,0.15)', // เงานุ่มๆ
      },
    },
  },
  plugins: [],
};
