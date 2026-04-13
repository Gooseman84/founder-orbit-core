/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "TrueBlazer"
const SITE_URL = "https://founder-orbit-core.lovable.app"

const WelcomeEmail = () => (
  <Html lang="en" dir="ltr">
    <Head>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap"
        rel="stylesheet"
      />
    </Head>
    <Preview>Welcome to TrueBlazer — let's build something real</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You're in.</Heading>
        <Text style={text}>
          Welcome to {SITE_NAME} — your AI co-founder for turning ideas into real ventures.
        </Text>
        <Text style={text}>
          Here's what happens next:
        </Text>
        <Text style={listItem}>
          ◆ <strong>Mavrik Interview</strong> — A quick AI conversation to understand your skills, goals, and constraints
        </Text>
        <Text style={listItem}>
          ◆ <strong>Market-Validated Ideas</strong> — Personalized venture ideas scored against real demand signals
        </Text>
        <Text style={listItem}>
          ◆ <strong>Execution Coaching</strong> — Daily tasks, 30-day plans, and a system that keeps you moving
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={`${SITE_URL}/discover`}>
            Start Your Interview
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          {SITE_NAME} — Stop building things that shouldn't be built.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: "Welcome to TrueBlazer — let's build something real",
  displayName: 'Welcome email',
  previewData: {},
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'DM Sans', Arial, sans-serif",
}

const container = {
  padding: '40px 25px',
  maxWidth: '560px',
  margin: '0 auto',
}

const h1 = {
  fontSize: '32px',
  fontWeight: '900' as const,
  color: 'hsl(240, 14%, 4%)',
  margin: '0 0 24px',
  fontFamily: "'Playfair Display', Georgia, serif",
}

const text = {
  fontSize: '15px',
  color: 'hsl(220, 12%, 58%)',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const listItem = {
  fontSize: '15px',
  color: 'hsl(220, 12%, 58%)',
  lineHeight: '1.6',
  margin: '0 0 12px',
  paddingLeft: '8px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: 'hsl(43, 52%, 54%)',
  color: 'hsl(240, 14%, 4%)',
  fontSize: '15px',
  fontWeight: '500' as const,
  padding: '14px 32px',
  borderRadius: '0px',
  textDecoration: 'none',
  display: 'inline-block',
  fontFamily: "'DM Sans', Arial, sans-serif",
}

const hr = {
  borderColor: '#e5e5e5',
  margin: '32px 0',
}

const footer = {
  fontSize: '12px',
  color: '#999999',
  margin: '0',
  fontFamily: "'DM Mono', monospace, sans-serif",
  letterSpacing: '0.02em',
}
