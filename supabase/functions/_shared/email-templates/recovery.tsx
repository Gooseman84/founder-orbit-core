/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password — get back to building.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>◆ TRUEBLAZER</Text>
        <Heading style={h1}>Reset your password.</Heading>
        <Text style={text}>
          We received a request to reset your password. Click below to choose a
          new one and get back to your venture.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Reset Password
        </Button>
        <Hr style={divider} />
        <Text style={footer}>
          If you didn't request this, your password won't change. You can safely
          ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '40px 32px' }
const eyebrow = {
  fontFamily: "'DM Mono', Courier, monospace",
  fontSize: '11px',
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
  color: 'hsl(43, 52%, 54%)',
  margin: '0 0 24px',
}
const h1 = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: 'hsl(240, 14%, 4%)',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: 'hsl(220, 12%, 58%)',
  lineHeight: '1.6',
  margin: '0 0 28px',
}
const button = {
  backgroundColor: 'hsl(43, 52%, 54%)',
  color: 'hsl(240, 14%, 4%)',
  fontSize: '14px',
  fontWeight: '600' as const,
  fontFamily: "'DM Sans', Arial, sans-serif",
  borderRadius: '0px',
  padding: '14px 28px',
  textDecoration: 'none',
  letterSpacing: '0.03em',
}
const divider = { borderColor: '#e5e5e5', margin: '32px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0', lineHeight: '1.5' }
