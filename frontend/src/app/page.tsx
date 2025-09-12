import { Box } from '@/components/ui/box'

export default function Home() {
  return (
    <Box className="p-6 bg-gray-50 min-h-screen">
      <Box className="max-w-md mx-auto">
        <Box className="bg-white p-4 rounded-lg shadow-sm mb-4">
          Box 元件測試
        </Box>

        <Box className="bg-blue-50 p-4 rounded-lg">✅ Box 元件正常運作</Box>
      </Box>
    </Box>
  )
}
