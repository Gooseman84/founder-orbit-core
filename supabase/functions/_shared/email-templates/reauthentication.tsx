/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code for TrueBlazer.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>◆ TRUEBLAZER</Text>
        <Heading style={h1}>Verify your identity.</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Hr style={divider} />
        <Text style={footer}>
          This code expires shortly. If you didn't request this, you can safely
          ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: "'DM Mono', Courier, monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: 'hsl(43, 52%, 54%)',
  letterSpacing: '0.15em',
  margin: '0 0 32px',
}
const divider = { borderColor: '#e5e5e5', margin: '32px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0', lineHeight: '1.5' }
