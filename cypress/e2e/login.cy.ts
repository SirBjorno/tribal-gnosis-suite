describe('Login Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should successfully log in with valid credentials', () => {
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    // Verify successful login
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-menu"]').should('be.visible');
  });

  it('should show error message with invalid credentials', () => {
    cy.get('input[type="email"]').type('invalid@example.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();

    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', 'Invalid credentials');
  });

  it('should validate required fields', () => {
    cy.get('button[type="submit"]').click();

    cy.get('[data-testid="email-error"]')
      .should('be.visible')
      .and('contain', 'Email is required');
    
    cy.get('[data-testid="password-error"]')
      .should('be.visible')
      .and('contain', 'Password is required');
  });
});