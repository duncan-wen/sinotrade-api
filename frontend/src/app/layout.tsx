import '../styles/globals.css'
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider/index.next15'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <GluestackUIProvider mode="system">{children}</GluestackUIProvider>
      </body>
    </html>
  )
}
