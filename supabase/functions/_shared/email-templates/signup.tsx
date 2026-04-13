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
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email — let's build something real.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>◆ TRUEBLAZER</Text>
        <Heading style={h1}>Welcome aboard.</Heading>
        <Text style={text}>
          You just took the first step toward building a market-validated venture.
          Confirm your email to unlock your AI co-founder experience.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm & Get Started
        </Button>
        <Hr style={divider} />
        <Text style={footer}>
          If you didn't sign up for{' '}
          <Link href={siteUrl} style={footerLink}>TrueBlazer</Link>,
          you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
const footerLink = { color: 'hsl(43, 52%, 54%)', textDecoration: 'underline' }
