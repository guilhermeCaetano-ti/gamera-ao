// ============================================
// JOGO: RATO ROBÔ vs GATOS ALADOS
// Um jogo de plataforma com combate e inimigos
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ============================================
// CONFIGURAÇÕES DO JOGO
// ============================================
const CONFIG = {
    // Física
    GRAVITY: 0.45,
    GROUND_LEVEL: canvas.height - 80,
    JUMP_STRENGTH: 13,
    JUMP_BUFFER: 6,
    MOVE_SPEED: 4.8,
    
    // Saúde e Combate
    MAX_HEALTH: 5,
    INVULNERABILITY_TIME: 60,
    SHOOT_COOLDOWN: 10,
    
    // Fases/Níveis
    CURRENT_LEVEL: 1,
    MAX_LEVEL: 3,
    
    // Spawning de Inimigos
    ENEMY_SPAWN_INTERVAL: 2000,
    ENEMY_SPAWN_COOLDOWN: 0,
    MAX_ENEMIES_LEVEL_1: 3,
    MAX_ENEMIES_LEVEL_2: 5,
    MAX_ENEMIES_LEVEL_3: 0,
    
    // IA Inimigos
    ENEMY_DETECTION_RANGE: 250,
    ENEMY_MIN_SHOOT_COOLDOWN: 40,
    ENEMY_MAX_SHOOT_COOLDOWN: 90,
    
    // Boss
    BOSS_HEALTH: 25,
    BOSS_PHASE_2_TRIGGER: 0.5,
};

// ============================================
// CLASSE: PARTÍCULA (EFEITOS VISUAIS)
// ============================================
class Particle {
    constructor(x, y, vx, vy, color, life = 30) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.maxLife = life;
        this.life = life;
        this.size = 3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // gravidade
        this.life--;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isAlive() {
        return this.life > 0;
    }
}

// ============================================
// CLASSE: QUEIJO (PROJÉTIL DO JOGADOR)
// ============================================
class Queijo {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.width = 12;
        this.height = 10;
        this.vx = direction === 'right' ? 8 : -8;
        this.vy = 0;
        this.color = '#ffdd00';
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = 'rgba(255, 221, 0, 0.8)';
        ctx.shadowBlur = 12;
        
        // Desenhar queijo (bloco com furos)
        ctx.beginPath();
        ctx.arc(this.x, this.y - 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Furos (simular queijo Suíço)
        ctx.fillStyle = '#0f1419';
        ctx.beginPath();
        ctx.arc(this.x - 2, this.y - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 2, this.y - 1, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    isOffScreen() {
        return this.x < -20 || this.x > canvas.width + 20;
    }
}

// ============================================
// CLASSE: BOLA DE PELO (PROJÉTIL DO INIMIGO)
// ============================================
class BolaDePelo {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.vx = direction === 'right' ? 6 : -6;
        this.vy = 2;
        this.gravity = 0.15;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = 'rgba(255, 68, 68, 0.8)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Efeito de fogo/energia
        ctx.strokeStyle = '#ff8844';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    isOffScreen() {
        return this.x < -20 || this.x > canvas.width + 20 || this.y > canvas.height + 50;
    }
}

// ============================================
// CLASSE: RATO ROBÔ (JOGADOR)
// ============================================
class RatoRobo {
    constructor(x, y) {
        // Posição e dimensões
        this.x = x;
        this.y = y;
        this.width = 28;
        this.height = 35;
        this.normalHeight = 35;
        
        // Velocidade
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Estados
        this.isGrounded = false;
        this.isMoveLeft = false;
        this.isMoveRight = false;
        this.isCrouching = false;
        this.facingRight = true;
        this.isJumping = false;
        
        // Propriedades
        this.health = CONFIG.MAX_HEALTH;
        this.maxHealth = CONFIG.MAX_HEALTH;
        this.invulnerabilityTime = 0;
        this.shootCooldown = 0;
        
        // Cores - Estilo Fantasia Tecnológica
        this.primaryColor = '#2dd4a8';   // Verde esmeralda
        this.secondaryColor = '#60a5fa';  // Azul brilhante
        this.accentColor = '#f472b6';     // Rosa coral
        
        // Animação
        this.walkTimer = 0;
        this.jumpBuffer = 0;
    }

    update() {
        // Aplicar gravidade
        this.velocityY += CONFIG.GRAVITY;
        
        // Atualizar posição
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Fricção
        this.velocityX *= 0.88;
        
        // Movimento horizontal
        if (this.isMoveLeft) {
            this.velocityX = -CONFIG.MOVE_SPEED;
            this.facingRight = false;
        }
        if (this.isMoveRight) {
            this.velocityX = CONFIG.MOVE_SPEED;
            this.facingRight = true;
        }
        
        // Colisão com o chão
        if (this.y + this.height >= CONFIG.GROUND_LEVEL) {
            this.y = CONFIG.GROUND_LEVEL - this.height;
            this.velocityY = 0;
            this.isGrounded = true;
            this.isJumping = false;
        } else {
            this.isGrounded = false;
        }
        
        // Colisão com bordas
        if (this.x < 0) {
            this.x = 0;
        }
        if (this.x + this.width > canvas.width) {
            this.x = canvas.width - this.width;
        }
        
        // Altura ao agachar
        if (this.isCrouching) {
            this.height = this.normalHeight * 0.7;
        } else {
            this.height = this.normalHeight;
        }
        
        // Atualizar timers
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime--;
        }
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }
        
        // Animação de caminhada
        if (this.isMoveLeft || this.isMoveRight) {
            this.walkTimer += 0.15;
        } else {
            this.walkTimer += 0.05; // idle animation
        }
    }

    jump() {
        if (this.isGrounded && !this.isCrouching) {
            this.velocityY = -CONFIG.JUMP_STRENGTH;
            this.isGrounded = false;
            this.isJumping = true;
        }
    }

    shoot() {
        if (this.shootCooldown <= 0) {
            this.shootCooldown = CONFIG.SHOOT_COOLDOWN;
            const offsetX = this.facingRight ? this.width : 0;
            return new Queijo(
                this.x + offsetX + (this.facingRight ? 5 : -5),
                this.y + this.height / 2,
                this.facingRight ? 'right' : 'left'
            );
        }
        return null;
    }

    takeDamage(amount = 1) {
        if (this.invulnerabilityTime <= 0) {
            this.health -= amount;
            this.invulnerabilityTime = CONFIG.INVULNERABILITY_TIME;
            return true;
        }
        return false;
    }

    heal(amount = 1) {
        this.health = Math.min(this.health + amount, this.maxHealth);
    }

    draw(ctx) {
        ctx.save();
        
        // Efeito de piscada ao levar dano
        if (this.invulnerabilityTime > 0 && Math.floor(this.invulnerabilityTime / 5) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        // Glow quando em ar
        if (!this.isGrounded) {
            ctx.shadowColor = 'rgba(45, 212, 168, 0.6)';
            ctx.shadowBlur = 20;
        }
        
        ctx.translate(this.x + this.width / 2, this.y);
        
        // Escala de espelho para virar o personagem
        if (!this.facingRight) {
            ctx.scale(-1, 1);
        }
        
        // ===== CORPO MAIN =====
        ctx.fillStyle = this.primaryColor;
        ctx.shadowColor = 'rgba(45, 212, 168, 0.8)';
        ctx.shadowBlur = 15;
        this.drawRoundedRect(-10, 10, 20, 15, 3);
        ctx.fill();
        
        // Painel do corpo
        ctx.strokeStyle = this.secondaryColor;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(96, 165, 250, 0.6)';
        ctx.shadowBlur = 10;
        this.drawRoundedRect(-8, 12, 16, 12, 2);
        ctx.stroke();
        
        // ===== CAUDA ROBÓTICA =====
        const tailOffset = Math.sin(this.walkTimer * 0.3) * 3;
        const tailWave = Math.cos(this.walkTimer * 0.4) * 2;
        ctx.strokeStyle = this.secondaryColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(96, 165, 250, 0.8)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(10, 20);
        ctx.quadraticCurveTo(18 + tailOffset, 15 + tailWave, 20 + tailOffset, 5);
        ctx.stroke();
        
        // Ponta da cauda
        ctx.fillStyle = this.accentColor;
        ctx.shadowColor = 'rgba(244, 114, 182, 0.8)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(20 + tailOffset, 5, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== CABEÇA =====
        ctx.fillStyle = this.primaryColor;
        ctx.shadowColor = 'rgba(45, 212, 168, 0.8)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== ORELHAS =====
        const earAnimation = Math.sin(this.walkTimer * 0.2) * 2;
        
        // Orelha esquerda
        ctx.fillStyle = this.primaryColor;
        ctx.shadowColor = 'rgba(45, 212, 168, 0.8)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(-6, -8 + earAnimation, 3.5, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Detalhe da orelha esquerda
        ctx.fillStyle = this.accentColor;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(-6, -7 + earAnimation, 1.5, 3, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Orelha direita
        ctx.fillStyle = this.primaryColor;
        ctx.shadowColor = 'rgba(45, 212, 168, 0.8)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(6, -8 + earAnimation, 3.5, 6, 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Detalhe da orelha direita
        ctx.fillStyle = this.accentColor;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(6, -7 + earAnimation, 1.5, 3, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // ===== OLHOS =====
        const eyeColor = '#60a5fa';    // Azul brilhante
        const eyeGlow = '#2dd4a8';     // Verde esmeralda
        
        // Olho esquerdo
        ctx.fillStyle = eyeColor;
        ctx.shadowColor = 'rgba(96, 165, 250, 0.9)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(-4, -1, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupila esquerda
        ctx.fillStyle = '#000000';
        ctx.shadowColor = 'transparent';
        ctx.beginPath();
        ctx.arc(-4, -1, 1.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Brilho esquerdo
        ctx.fillStyle = eyeGlow;
        ctx.shadowColor = 'rgba(45, 212, 168, 0.8)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(-2.5, -2, 0.9, 0, Math.PI * 2);
        ctx.fill();
        
        // Olho direito
        ctx.fillStyle = eyeColor;
        ctx.shadowColor = 'rgba(96, 165, 250, 0.9)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(4, -1, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupila direita
        ctx.fillStyle = '#000000';
        ctx.shadowColor = 'transparent';
        ctx.beginPath();
        ctx.arc(4, -1, 1.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Brilho direito
        ctx.fillStyle = eyeGlow;
        ctx.shadowColor = 'rgba(45, 212, 168, 0.8)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(5.5, -2, 0.9, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== NARIZ/FOCINHO =====
        ctx.fillStyle = this.secondaryColor;
        ctx.shadowColor = 'rgba(96, 165, 250, 0.6)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== BOCA =====
        ctx.strokeStyle = this.secondaryColor;
        ctx.lineWidth = 1;
        ctx.shadowColor = 'rgba(96, 165, 250, 0.6)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 4, 3, 0, Math.PI, false);
        ctx.stroke();
        
        // ===== PERNAS/PATAS =====
        const legAnimation = Math.sin(this.walkTimer * 0.3) * 2;
        
        // Pata esquerda
        ctx.strokeStyle = this.primaryColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(45, 212, 168, 0.6)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(-5, 25);
        ctx.lineTo(-5, 32 + legAnimation);
        ctx.stroke();
        
        // Pata direita
        ctx.beginPath();
        ctx.moveTo(5, 25);
        ctx.lineTo(5, 32 - legAnimation);
        ctx.stroke();
        
        ctx.restore();
    }

    drawRoundedRect(x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}

// ============================================
// CLASSE: GATO ALADO (INIMIGO)
// ============================================
class GatoAlado {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 28;
        
        // Movimento
        this.velocityX = Math.random() > 0.5 ? 2 : -2;
        this.direction = this.velocityX > 0 ? 1 : -1;
        this.patrolDistance = 200;
        this.startX = x;
        
        // Voar (flutuação)
        this.floatY = 0;
        this.floatSpeed = 0.03;
        
        // Combate
        this.health = 3;
        this.shootCooldown = Math.random() * 60 + 60;
        this.shootTimer = 0;
        
        // Cores - Estilo Fantasia Tecnológica
        this.primaryColor = '#f97316';     // Laranja queimado
        this.secondaryColor = '#fbbf24';   // Ouro quente
        this.accentColor = '#ec4899';      // Rosa choque
        
        // Animação
        this.wingTimer = 0;
    }

    update() {
        // Detecção do jogador
        const distToPlayer = Math.hypot(
            gameState.player.x - this.x,
            gameState.player.y - this.y
        );
        
        const playerDetected = distToPlayer < CONFIG.ENEMY_DETECTION_RANGE;
        
        // Movimento: patrulha normal ou perseguição quando detecta o jogador
        if (playerDetected) {
            // Perseguir o jogador
            this.velocityX = gameState.player.x < this.x ? -2.5 : 2.5;
            this.direction = this.velocityX > 0 ? 1 : -1;
        } else {
            // Patrulha normal
            this.x += this.velocityX;
            
            // Variação de movimento para parecer mais "vivo"
            if (Math.random() < 0.02) {
                this.velocityX *= -1;
                this.direction *= -1;
            }
        }
        
        // Inverter direção nos limites
        if (Math.abs(this.x - this.startX) > this.patrolDistance) {
            this.velocityX *= -1;
            this.direction *= -1;
        }
        
        // Colisão com bordas
        if (this.x < 0 || this.x > canvas.width) {
            this.velocityX *= -1;
            this.direction *= -1;
        }
        
        // Flutuação contínua
        this.floatY = Math.sin(this.y * 0.02 + Date.now() * 0.003) * 10;
        
        // Atualizar cooldown de tiro
        this.shootTimer++;
        
        // Animação de asas
        this.wingTimer += 0.2;
    }

    shoot() {
        if (this.shootTimer > this.shootCooldown) {
            this.shootTimer = 0;
            this.shootCooldown = Math.random() * (CONFIG.ENEMY_MAX_SHOOT_COOLDOWN - CONFIG.ENEMY_MIN_SHOOT_COOLDOWN) + CONFIG.ENEMY_MIN_SHOOT_COOLDOWN;
            return new BolaDePelo(
                this.x + this.width / 2,
                this.y + this.height / 2,
                this.direction > 0 ? 'right' : 'left'
            );
        }
        return null;
    }

    takeDamage(amount = 1) {
        this.health -= amount;
        return this.health <= 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.floatY);
        
        // Espelhar se estiver indo para esquerda
        if (this.direction < 0) {
            ctx.scale(-1, 1);
        }
        
        // Glow
        ctx.shadowColor = 'rgba(255, 102, 0, 0.6)';
        ctx.shadowBlur = 15;
        
        // ===== CORPO =====
        ctx.fillStyle = this.primaryColor;
        this.drawRoundedRect(-12, 0, 24, 18, 4);
        ctx.fill();
        
        // Painel do corpo
        ctx.strokeStyle = this.secondaryColor;
        ctx.lineWidth = 1.5;
        this.drawRoundedRect(-10, 3, 20, 12, 2);
        ctx.stroke();
        
        // ===== CABEÇA =====
        ctx.fillStyle = this.primaryColor;
        ctx.shadowColor = 'rgba(255, 102, 0, 0.6)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, -8, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== ORELHAS (triângulares) =====
        ctx.fillStyle = this.primaryColor;
        ctx.beginPath();
        ctx.moveTo(-5, -16);
        ctx.lineTo(-8, -12);
        ctx.lineTo(-2, -12);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(5, -16);
        ctx.lineTo(2, -12);
        ctx.lineTo(8, -12);
        ctx.closePath();
        ctx.fill();
        
        // ===== OLHOS =====
        ctx.fillStyle = '#00ff00';
        ctx.shadowColor = 'rgba(0, 255, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(-3, -8, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(3, -8, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupilas
        ctx.fillStyle = '#000000';
        ctx.shadowColor = 'transparent';
        ctx.beginPath();
        ctx.arc(-3, -8, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3, -8, 1, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== ASAS =====
        const wingFlap = Math.sin(this.wingTimer) * 0.4;
        
        // Asa esquerda
        ctx.strokeStyle = this.accentColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(255, 0, 153, 0.6)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(-12 - wingFlap, 5, 6 + Math.abs(wingFlap), 0, Math.PI * 2);
        ctx.stroke();
        
        // Asa direita
        ctx.beginPath();
        ctx.arc(12 + wingFlap, 5, 6 + Math.abs(wingFlap), 0, Math.PI * 2);
        ctx.stroke();
        
        // ===== CAUDA =====
        ctx.strokeStyle = this.secondaryColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(255, 170, 0, 0.6)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, 18);
        ctx.quadraticCurveTo(5, 25, 3, 32);
        ctx.stroke();
        
        ctx.restore();
    }

    drawRoundedRect(x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}

// ============================================
// CLASSE: GATO REI ALADO (BOSS)
// ============================================
class GatoReiAlado {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 50;
        this.radius = 30; // para colisão
        
        // Movimento
        this.velocityX = 1.5;
        this.direction = 1;
        this.boundaryLeft = canvas.width * 0.2;
        this.boundaryRight = canvas.width * 0.8;
        
        // Flutuação
        this.floatY = 0;
        this.floatTimer = 0;
        
        // Combate
        this.health = CONFIG.BOSS_HEALTH;
        this.maxHealth = CONFIG.BOSS_HEALTH;
        this.phase = 1;
        this.shootTimer = 0;
        this.shootCooldown = 80;
        this.shootCount = 0;
        
        // Cores - Tema escuro e ameaçador
        this.primaryColor = '#8b5cf6';     // Roxo profundo
        this.secondaryColor = '#ec4899';   // Rosa intenso
        this.accentColor = '#fbbf24';      // Ouro
        
        // Animação
        this.wingTimer = 0;
        this.damageFlash = 0;
    }

    update() {
        // Movimento com padrão mais complexo
        this.x += this.velocityX * (this.phase === 1 ? 1 : 1.5);
        
        // Inverter direção nos limites
        if (this.x < this.boundaryLeft || this.x > this.boundaryRight) {
            this.velocityX *= -1;
            this.direction *= -1;
        }
        
        // Flutuação sinuosa
        this.floatTimer += 0.05;
        this.floatY = Math.sin(this.floatTimer) * 15;
        
        // Animação de asas
        this.wingTimer += 0.25;
        
        // Atualizar fase baseado em vida
        if (this.health <= this.maxHealth * CONFIG.BOSS_PHASE_2_TRIGGER) {
            this.phase = 2;
        }
        
        // IA: Ataque mais agressivo na fase 2
        this.shootTimer++;
        const shootCooldownPhase = this.phase === 1 ? 80 : 40;
        if (this.shootTimer > shootCooldownPhase) {
            this.shootTimer = 0;
            this.shootCount = this.phase === 1 ? 1 : 3; // 1 tiro na fase 1, 3 na fase 2
        }
        
        // Atualizar flash de dano
        if (this.damageFlash > 0) {
            this.damageFlash--;
        }
    }

    shoot() {
        const shots = [];
        if (this.shootCount > 0) {
            for (let i = 0; i < this.shootCount; i++) {
                const offsetY = i === 0 ? 0 : (i === 1 ? -10 : 10);
                shots.push(new BolaDePeloBoss(
                    this.x + this.width / 2,
                    this.y + this.height / 2 + offsetY,
                    this.direction > 0 ? 'right' : 'left'
                ));
            }
            this.shootCount = 0;
        }
        return shots;
    }

    takeDamage(amount = 1) {
        this.health -= amount;
        this.damageFlash = 10;
        return this.health <= 0;
    }

    draw(ctx) {
        ctx.save();
        
        // Flash de dano
        if (this.damageFlash > 0) {
            ctx.globalAlpha = 0.7;
        }
        
        ctx.translate(this.x + this.width / 2, this.y + this.floatY);
        
        // Espelhar se indo para esquerda
        if (this.direction < 0) {
            ctx.scale(-1, 1);
        }
        
        // Glow intenso
        ctx.shadowColor = 'rgba(139, 92, 246, 0.8)';
        ctx.shadowBlur = 25;
        
        // ===== CORPO PRINCIPAL =====
        ctx.fillStyle = this.primaryColor;
        this.drawRoundedRect(-25, -10, 50, 35, 6);
        ctx.fill();
        
        // Detalhes do corpo
        ctx.strokeStyle = this.accentColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.ellipse(0, 5, 20, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // ===== COROA =====
        ctx.fillStyle = this.accentColor;
        ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
        ctx.shadowBlur = 15;
        for (let i = 0; i < 5; i++) {
            const spike = i - 2;
            ctx.beginPath();
            ctx.moveTo(spike * 12, -22);
            ctx.lineTo(spike * 12 - 5, -35);
            ctx.lineTo(spike * 12 + 5, -35);
            ctx.closePath();
            ctx.fill();
        }
        
        // Joia central da coroa
        ctx.fillStyle = '#ff006e';
        ctx.shadowColor = 'rgba(255, 0, 110, 0.8)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, -25, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== CABEÇA =====
        ctx.fillStyle = this.primaryColor;
        ctx.shadowColor = 'rgba(139, 92, 246, 0.8)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, -15, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== ORELHAS GRANDES =====
        ctx.fillStyle = this.primaryColor;
        ctx.beginPath();
        ctx.ellipse(-10, -25, 6, 12, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(10, -25, 6, 12, 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // Detalhe das orelhas
        ctx.fillStyle = this.secondaryColor;
        ctx.beginPath();
        ctx.ellipse(-10, -24, 2.5, 6, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(10, -24, 2.5, 6, 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== OLHOS VERMELHOS =====
        const eyeColor = '#ff006e';
        ctx.fillStyle = eyeColor;
        ctx.shadowColor = 'rgba(255, 0, 110, 0.8)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(-5, -16, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5, -16, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupilas
        ctx.fillStyle = '#000000';
        ctx.shadowColor = 'transparent';
        ctx.beginPath();
        ctx.arc(-5, -16, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5, -16, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== ASAS GIGANTES =====
        const wingFlap = Math.sin(this.wingTimer) * 0.5;
        
        // Asa esquerda
        ctx.strokeStyle = this.secondaryColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(236, 72, 153, 0.8)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(-30 - wingFlap * 5, 5, 15 + Math.abs(wingFlap * 5), 0, Math.PI * 2);
        ctx.stroke();
        
        // Asa direita
        ctx.beginPath();
        ctx.arc(30 + wingFlap * 5, 5, 15 + Math.abs(wingFlap * 5), 0, Math.PI * 2);
        ctx.stroke();
        
        // ===== CAUDA ARGH =====
        ctx.strokeStyle = this.accentColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(251, 191, 36, 0.6)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, 25);
        ctx.quadraticCurveTo(15, 35, 20, 50);
        ctx.stroke();
        
        ctx.restore();
    }

    drawRoundedRect(x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}

// ============================================
// CLASSE: BOLA DE PELO DO BOSS (MAIOR)
// ============================================
class BolaDePeloBoss {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.vx = direction === 'right' ? 7 : -7;
        this.vy = 1;
        this.gravity = 0.15;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#ff006e';
        ctx.shadowColor = 'rgba(255, 0, 110, 0.8)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Efeito de energia
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    isOffScreen() {
        return this.x < -20 || this.x > canvas.width + 20 || this.y > canvas.height + 50;
    }
}

// ============================================
// ESTADO DO JOGO
// ============================================
let gameState = {
    player: new RatoRobo(canvas.width / 2 - 14, CONFIG.GROUND_LEVEL - 35),
    enemies: [],
    boss: null,
    queijos: [],
    bolas: [],
    particles: [],
    score: 0,
    gameOver: false,
    enemiesDefeated: 0,
};

// ============================================
// SISTEMA DE CONTROLES
// ============================================
const keys = {};

window.addEventListener('keydown', (e) => {
    const key = e.key.toUpperCase();
    keys[key] = true;
    
    // Pular
    if (key === 'W') {
        gameState.player.jump();
    }
    
    // Atirar
    if (key === ' ') {
        const queijo = gameState.player.shoot();
        if (queijo) {
            gameState.queijos.push(queijo);
            // Partículas de tiro
            for (let i = 0; i < 3; i++) {
                gameState.particles.push(
                    new Particle(
                        gameState.player.x + gameState.player.width / 2,
                        gameState.player.y + gameState.player.height / 2,
                        (Math.random() - 0.5) * 3,
                        (Math.random() - 0.5) * 3,
                        '#ffdd00',
                        20
                    )
                );
            }
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toUpperCase()] = false;
});

// ============================================
// FUNÇÕES DE ATUALIZAÇÃO DO JOGO
// ============================================
function updatePlayer() {
    const player = gameState.player;
    
    player.isMoveLeft = keys['A'];
    player.isMoveRight = keys['D'];
    player.isCrouching = keys['S'];
    
    player.update();
}

function updateEnemies() {
    // Lógica de spawn baseada na fase
    let maxEnemies = CONFIG.MAX_ENEMIES_LEVEL_1;
    if (CONFIG.CURRENT_LEVEL === 2) maxEnemies = CONFIG.MAX_ENEMIES_LEVEL_2;
    if (CONFIG.CURRENT_LEVEL === 3) maxEnemies = CONFIG.MAX_ENEMIES_LEVEL_3;
    
    // Spawnar novos inimigos (apenas se não estiver na fase do boss)
    if (CONFIG.CURRENT_LEVEL < 3) {
        CONFIG.ENEMY_SPAWN_COOLDOWN--;
        if (CONFIG.ENEMY_SPAWN_COOLDOWN <= 0 && gameState.enemies.length < maxEnemies) {
            const randomX = Math.random() > 0.5 
                ? Math.random() * 200 
                : canvas.width - Math.random() * 200;
            gameState.enemies.push(new GatoAlado(randomX, CONFIG.GROUND_LEVEL - 150));
            CONFIG.ENEMY_SPAWN_COOLDOWN = CONFIG.ENEMY_SPAWN_INTERVAL;
        }
    }
    
    // Atualizar inimigos regulares
    gameState.enemies.forEach((enemy, index) => {
        enemy.update();
        
        // Inimigo tira
        const bola = enemy.shoot();
        if (bola) {
            gameState.bolas.push(bola);
        }
        
        // Remover inimigos que saíram da tela ou morreram
        if (enemy.y > canvas.height || enemy.health <= 0) {
            gameState.enemies.splice(index, 1);
            gameState.enemiesDefeated++;
            
            // Avançar para a próxima fase se destruiu todos
            if (gameState.enemies.length === 0 && CONFIG.CURRENT_LEVEL < 3) {
                CONFIG.CURRENT_LEVEL++;
                CONFIG.ENEMY_SPAWN_COOLDOWN = 0;
                
                // Se chegou na fase 3, spawnar o boss
                if (CONFIG.CURRENT_LEVEL === 3) {
                    gameState.boss = new GatoReiAlado(canvas.width / 2 - 30, 100);
                }
            }
        }
    });
    
    // Atualizar boss se existir
    if (gameState.boss) {
        gameState.boss.update();
        
        // Boss tira
        const shots = gameState.boss.shoot();
        shots.forEach(shot => gameState.bolas.push(shot));
        
        // Remover boss se morreu
        if (gameState.boss.health <= 0) {
            gameState.boss = null;
            gameState.score += 500;
            gameState.gameOver = true; // Vitória!
        }
    }
}

function updateProjectiles() {
    // Queijos (do jogador)
    gameState.queijos.forEach((queijo, index) => {
        queijo.update();
        
        // Verificar colisão com inimigos
        gameState.enemies.forEach((enemy, enemyIndex) => {
            if (checkCollision(queijo, enemy)) {
                const isDead = enemy.takeDamage(1);
                gameState.queijos.splice(index, 1);
                gameState.score += 10;
                
                // Partículas ao acertar
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 * i) / 8;
                    gameState.particles.push(
                        new Particle(
                            enemy.x,
                            enemy.y,
                            Math.cos(angle) * 3,
                            Math.sin(angle) * 3,
                            '#fbbf24',
                            40
                        )
                    );
                }
                
                if (isDead) {
                    gameState.score += 50;
                }
            }
        });
        
        // Verificar colisão com boss
        if (gameState.boss && checkCollision(queijo, gameState.boss)) {
            const isDead = gameState.boss.takeDamage(1);
            gameState.queijos.splice(index, 1);
            gameState.score += 25;
            
            // Partículas ao acertar o boss
            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 * i) / 12;
                gameState.particles.push(
                    new Particle(
                        gameState.boss.x,
                        gameState.boss.y,
                        Math.cos(angle) * 4,
                        Math.sin(angle) * 4,
                        '#ec4899',
                        50
                    )
                );
            }
        }
        
        // Remover se sair da tela
        if (queijo.isOffScreen()) {
            gameState.queijos.splice(index, 1);
        }
    });
    
    // Bolas de pelo (dos inimigos e boss)
    gameState.bolas.forEach((bola, index) => {
        bola.update();
        
        // Verificar colisão com jogador
        if (checkCollision(bola, gameState.player)) {
            if (gameState.player.takeDamage(1)) {
                // Partículas ao levar dano
                for (let i = 0; i < 10; i++) {
                    const angle = (Math.PI * 2 * i) / 10;
                    gameState.particles.push(
                        new Particle(
                            gameState.player.x + gameState.player.width / 2,
                            gameState.player.y + gameState.player.height / 2,
                            Math.cos(angle) * 4,
                            Math.sin(angle) * 4,
                            '#ff006e',
                            50
                        )
                    );
                }
            }
            gameState.bolas.splice(index, 1);
        }
        
        // Remover se sair da tela
        if (bola.isOffScreen()) {
            gameState.bolas.splice(index, 1);
        }
    });
}

function updateParticles() {
    gameState.particles.forEach((particle, index) => {
        particle.update();
        if (!particle.isAlive()) {
            gameState.particles.splice(index, 1);
        }
    });
}

function checkCollision(obj1, obj2) {
    // Colisão simples AABB
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + (obj1.width || obj1.radius * 2) > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + (obj1.height || obj1.radius * 2) > obj2.y;
}

function update() {
    if (gameState.gameOver) return;
    
    updatePlayer();
    updateEnemies();
    updateProjectiles();
    updateParticles();
    
    // Verificar Game Over
    if (gameState.player.health <= 0) {
        gameState.gameOver = true;
    }
}

// ============================================
// FUNÇÕES DE RENDERIZAÇÃO
// ============================================
function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1e0b33');      // Roxo escuro no topo
    gradient.addColorStop(0.5, '#2d1b54');    // Roxo médio
    gradient.addColorStop(1, '#1a3a3a');      // Verde escuro embaixo
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Efeito de partículas/brilhos no fundo
    ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
    for (let i = 0; i < 20; i++) {
        const x = (i * 59) % canvas.width;
        const y = (i * 127) % canvas.height;
        ctx.fillRect(x, y, 2, 2);
    }
}

function drawGround() {
    ctx.fillStyle = '#0d5d5d';
    ctx.shadowColor = 'rgba(45, 212, 168, 0.3)';
    ctx.shadowBlur = 10;
    ctx.fillRect(0, CONFIG.GROUND_LEVEL, canvas.width, canvas.height - CONFIG.GROUND_LEVEL);
    
    // Borda com brilho verde esmeralda
    ctx.strokeStyle = '#2dd4a8';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(45, 212, 168, 0.8)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.GROUND_LEVEL);
    ctx.lineTo(canvas.width, CONFIG.GROUND_LEVEL);
    ctx.stroke();
}

function drawGameElements() {
    // Desenhar inimigos
    gameState.enemies.forEach(enemy => {
        enemy.draw(ctx);
    });
    
    // Desenhar boss se existir
    if (gameState.boss) {
        gameState.boss.draw(ctx);
    }
    
    // Desenhar projéteis
    gameState.queijos.forEach(queijo => {
        queijo.draw(ctx);
    });
    
    gameState.bolas.forEach(bola => {
        bola.draw(ctx);
    });
    
    // Desenhar partículas
    gameState.particles.forEach(particle => {
        particle.draw(ctx);
    });
    
    // Desenhar jogador por último (front)
    gameState.player.draw(ctx);
}

function drawHUD() {
    // Limpar sombras
    ctx.shadowColor = 'transparent';
    
    // Vida do jogador
    const healthDisplay = document.getElementById('healthDisplay');
    let hearts = '';
    for (let i = 0; i < gameState.player.maxHealth; i++) {
        if (i < gameState.player.health) {
            hearts += '❤️';
        } else {
            hearts += '🖤';
        }
    }
    healthDisplay.textContent = hearts;
    
    // Contador de inimigos ou informações do boss
    const enemyCountDisplay = document.getElementById('enemyCount');
    if (gameState.boss) {
        const bossHealthPercent = Math.max(0, Math.floor((gameState.boss.health / gameState.boss.maxHealth) * 100));
        enemyCountDisplay.textContent = `BOSS ${gameState.boss.phase === 2 ? '[FASE 2]' : '[FASE 1]'} - ${bossHealthPercent}%`;
    } else {
        enemyCountDisplay.textContent = gameState.enemies.length;
    }
    
    // Pontuação
    document.getElementById('scoreDisplay').textContent = gameState.score;
    
    // Exibir fase/nível no canvas
    ctx.fillStyle = '#2dd4a8';
    ctx.font = 'bold 16px Arial';
    ctx.shadowColor = 'rgba(45, 212, 168, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText(`FASE ${CONFIG.CURRENT_LEVEL}`, 20, 30);
}

function drawGameOver() {
    if (!gameState.gameOver) return;
    
    const gameOverScreen = document.getElementById('gameOverScreen');
    const gameOverTitle = document.getElementById('gameOverTitle');
    const gameOverMessage = document.getElementById('gameOverMessage');
    
    // Verificar se foi vitória ou derrota
    const isVictory = gameState.boss === null && CONFIG.CURRENT_LEVEL === 3;
    
    if (isVictory) {
        gameOverTitle.textContent = '🎉 VITÓRIA! 🎉';
        gameOverTitle.style.color = '#fbbf24';
        gameOverScreen.style.background = 'rgba(0, 0, 0, 0.85)';
        gameOverMessage.textContent = `Você derrotou o Gato Rei Alado! Pontuação: ${gameState.score}`;
        gameOverMessage.style.color = '#2dd4a8';
    } else {
        gameOverTitle.textContent = 'GAME OVER';
        gameOverTitle.style.color = '#ff006e';
        gameOverMessage.textContent = `Pontuação: ${gameState.score} | Inimigos Derrotados: ${gameState.enemiesDefeated} | Fase: ${CONFIG.CURRENT_LEVEL}`;
    }
    
    gameOverScreen.classList.remove('hidden');
}

function draw() {
    drawBackground();
    drawGround();
    drawGameElements();
    drawHUD();
    drawGameOver();
}

// ============================================
// LOOP PRINCIPAL
// ============================================
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ============================================
// INICIALIZAÇÃO E EVENTOS
// ============================================
document.getElementById('restartBtn').addEventListener('click', () => {
    // Reiniciar estado do jogo
    gameState = {
        player: new RatoRobo(canvas.width / 2 - 14, CONFIG.GROUND_LEVEL - 35),
        enemies: [],
        boss: null,
        queijos: [],
        bolas: [],
        particles: [],
        score: 0,
        gameOver: false,
        enemiesDefeated: 0,
    };
    CONFIG.ENEMY_SPAWN_COOLDOWN = 0;
    CONFIG.CURRENT_LEVEL = 1;
    
    // Esconder tela de game over
    document.getElementById('gameOverScreen').classList.add('hidden');
});

// Iniciar o jogo
console.log('🤖 RATO ROBÔ vs 🐱 GATOS ALADOS - Jogo iniciado!');
console.log('Controles: W (pular) | A (esquerda) | D (direita) | S (agachar) | ESPAÇO (atirar)');
gameLoop();
