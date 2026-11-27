/**
 * Contratos HTTP compartilhados entre web e API.
 * Cada schema Zod valida a entrada na API e a resposta na web;
 * os tipos derivados mantêm os dois lados em sincronia no typecheck.
 */
export * from './health'
export * from './auth'
export * from './barbershops'
export * from './services'
export * from './invitations'
export * from './memberships'
export * from './barber-services'
export * from './availability'
