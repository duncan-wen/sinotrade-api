import '../styles/globals.css'
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider/index.next15'
import StyledJsxRegistry from './registry'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <StyledJsxRegistry>
          <GluestackUIProvider mode="system">{children}</GluestackUIProvider>
        </StyledJsxRegistry>
      </body>
    </html>
  )
}
