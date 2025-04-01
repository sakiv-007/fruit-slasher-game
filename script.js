const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let fruits = [];
let score = 0;
let swipeTrail = [];
let gameOver = false;
let particles = [];
let lastTime = 0;

// Load background image
const backgroundImage = new Image();
backgroundImage.src = "assets/bg.png";

const fruitImages = {
    apple: "assets/apple.png",
    banana: "assets/banana.png",
    orange: "assets/orange.png",
    watermelon: "assets/watermelon.png",
    bomb: "assets/bomb.png"
};

// Juice colors for particles
const juiceColors = {
    apple: "#ff0000",
    banana: "#ffff00",
    orange: "#ffa500",
    watermelon: "#ff6b81",
    bomb: "#333333"
};

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.color = color;
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * 6 - 3;
        this.gravity = 0.1;
        this.life = 100;
    }

    update(deltaTime) {
        this.speedY += this.gravity;
        this.x += this.speedX * (deltaTime / 16);
        this.y += this.speedY * (deltaTime / 16);
        this.life -= 2;
        if (this.size > 0.2) this.size -= 0.1;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 100;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class Fruit {
    constructor(x, y, size, type) {
        this.x = x;
        this.y = y;
        this.size = size * 2;
        this.type = type;
        this.isBomb = type === "bomb";
        this.velocity = {
            x: Math.random() * 4 - 2,
            y: Math.random() * -12 - 6
        };
        this.gravity = 0.2 + Math.random() * 0.1;
        this.sliced = false;
        this.slicedPieces = null;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.image = new Image();
        this.image.src = fruitImages[type];
        this.opacity = 1;
    }

    draw() {
        if (this.sliced && this.slicedPieces) {
            // Draw sliced pieces
            this.slicedPieces.forEach(piece => {
                ctx.save();
                ctx.translate(this.x + piece.offsetX, this.y + piece.offsetY);
                ctx.rotate(piece.rotation);
                ctx.globalAlpha = this.opacity;
                ctx.drawImage(this.image, -this.size / 2, -this.size / 2, this.size, this.size);
                ctx.globalAlpha = 1;
                ctx.restore();
            });
        } else if (!this.sliced) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.drawImage(this.image, -this.size / 2, -this.size / 2, this.size, this.size);
            ctx.restore();
        }
    }

    update(deltaTime) {
        this.y += this.velocity.y * (deltaTime / 16);
        this.x += this.velocity.x * (deltaTime / 16);
        this.velocity.y += this.gravity;
        this.rotation += this.rotationSpeed;
        
        if (this.sliced && this.slicedPieces) {
            this.slicedPieces[0].offsetX -= 1.5 * (deltaTime / 16);
            this.slicedPieces[0].offsetY -= 1.5 * (deltaTime / 16);
            this.slicedPieces[1].offsetX += 1.5 * (deltaTime / 16);
            this.slicedPieces[1].offsetY += 1.5 * (deltaTime / 16);
            this.slicedPieces[0].rotation += 0.08;
            this.slicedPieces[1].rotation -= 0.08;
            
            // Fade out sliced pieces
            if (this.opacity > 0) {
                this.opacity -= 0.005;
            }
        }
    }

    slice() {
        if (!this.sliced) {
            this.sliced = true;
            
            // Create sliced pieces effect
            this.slicedPieces = [
                { offsetX: -10, offsetY: -10, rotation: this.rotation - 0.5 },
                { offsetX: 10, offsetY: 10, rotation: this.rotation + 0.5 }
            ];
            
            // Create juice particles
            const juiceColor = juiceColors[this.type] || "#ff0000";
            for (let i = 0; i < 15; i++) {
                particles.push(new Particle(this.x, this.y, juiceColor));
            }
            
            // Add score
            if (!this.isBomb) {
                score += 1;
                document.getElementById("score").innerText = "Score: " + score;
                
                // Show score popup
                showScorePopup(this.x, this.y);
            }
        }
    }
}

function showScorePopup(x, y) {
    const popup = document.createElement("div");
    popup.className = "score-popup";
    popup.innerText = "+1";
    popup.style.left = x + "px";
    popup.style.top = y + "px";
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.remove();
    }, 1000);
}

function spawnFruit() {
    if (gameOver) return;
    const x = Math.random() * canvas.width;
    const y = canvas.height;
    const size = 60;
    const types = ["apple", "banana", "orange", "watermelon"];
    const type = Math.random() < 0.2 ? "bomb" : types[Math.floor(Math.random() * types.length)];
    fruits.push(new Fruit(x, y, size, type));
}

// Blade trail effect
class BladeTrail {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.life = 20;
    }
    
    update() {
        this.life -= 1;
        this.size -= 0.5;
    }
    
    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.life / 20})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

let bladeTrail = [];
let isMouseDown = false;
let lastMousePosition = { x: 0, y: 0 };

function animate(currentTime = 0) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    if (gameOver) {
        drawGameOver();
        return;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    if (backgroundImage.complete) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    }
    
    // Update and draw blade trail
    bladeTrail = bladeTrail.filter(trail => trail.life > 0);
    bladeTrail.forEach(trail => {
        trail.update();
        trail.draw();
    });
    
    // Draw swipe trail
    if (swipeTrail.length > 1) {
        // Outer glow
        ctx.beginPath();
        ctx.moveTo(swipeTrail[0].x, swipeTrail[0].y);
        for (let i = 1; i < swipeTrail.length; i++) {
            ctx.lineTo(swipeTrail[i].x, swipeTrail[i].y);
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 20;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
        
        // Inner bright line
        ctx.beginPath();
        ctx.moveTo(swipeTrail[0].x, swipeTrail[0].y);
        for (let i = 1; i < swipeTrail.length; i++) {
            ctx.lineTo(swipeTrail[i].x, swipeTrail[i].y);
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
    }
    
    // Update and draw particles
    particles = particles.filter(particle => particle.life > 0);
    particles.forEach(particle => {
        particle.update(deltaTime);
        particle.draw();
    });
    
    // Update and draw fruits
    fruits = fruits.filter(fruit => {
        if (fruit.sliced) {
            return fruit.y < canvas.height + 200 && fruit.opacity > 0;
        }
        return fruit.y < canvas.height + 100;
    });
    
    fruits.forEach(fruit => {
        fruit.update(deltaTime);
        fruit.draw();
    });
    
    // Draw score
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Score: " + score, canvas.width / 2, 50);
    
    // Manage swipe trail length
    if (swipeTrail.length > 20) {
        swipeTrail = swipeTrail.slice(-20);
    }
    
    // Age the swipe trail points
    swipeTrail.forEach((point, index) => {
        point.age = point.age || 0;
        point.age++;
        if (point.age > 8) {
            swipeTrail.splice(index, 1);
        }
    });
    
    requestAnimationFrame(animate);
}

function drawGameOver() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (backgroundImage.complete) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    }
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 50);
    
    ctx.font = "bold 48px Arial";
    ctx.fillText("Final Score: " + score, canvas.width / 2, canvas.height / 2 + 50);
    
    ctx.font = "24px Arial";
    ctx.fillText("Click anywhere to restart", canvas.width / 2, canvas.height / 2 + 120);
}

// Mouse and touch events
canvas.addEventListener("mousedown", (event) => {
    if (gameOver) {
        restartGame();
        return;
    }
    isMouseDown = true;
    const rect = canvas.getBoundingClientRect();
    lastMousePosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
    swipeTrail = [];
});

canvas.addEventListener("mouseup", () => {
    isMouseDown = false;
    swipeTrail = [];
});

canvas.addEventListener("mousemove", (event) => {
    if (gameOver) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentPosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
    
    // Add interpolation for smooth trail
    if (lastMousePosition.x && lastMousePosition.y) {
        const dx = currentPosition.x - lastMousePosition.x;
        const dy = currentPosition.y - lastMousePosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) { // Only create trail if mouse is moving
            swipeTrail.push({ x: currentPosition.x, y: currentPosition.y, age: 0 });
            bladeTrail.push(new BladeTrail(currentPosition.x, currentPosition.y));
            checkCollisions(currentPosition.x, currentPosition.y);
        }
    }
    
    lastMousePosition = currentPosition;
});

canvas.addEventListener("mouseleave", () => {
    lastMousePosition = { x: 0, y: 0 };
    swipeTrail = [];
});

// Touch events for mobile
canvas.addEventListener("touchstart", (event) => {
    event.preventDefault();
    if (gameOver) {
        restartGame();
        return;
    }
    isMouseDown = true;
    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    lastMousePosition = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
    };
    swipeTrail = [];
});

canvas.addEventListener("touchend", (event) => {
    event.preventDefault();
    isMouseDown = false;
    swipeTrail = [];
});

canvas.addEventListener("touchmove", (event) => {
    event.preventDefault();
    if (gameOver) return;
    
    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    const currentPosition = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
    };
    
    // Add interpolation for smooth trail
    if (lastMousePosition.x && lastMousePosition.y) {
        const dx = currentPosition.x - lastMousePosition.x;
        const dy = currentPosition.y - lastMousePosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) { // Only create trail if touch is moving
            swipeTrail.push({ x: currentPosition.x, y: currentPosition.y, age: 0 });
            bladeTrail.push(new BladeTrail(currentPosition.x, currentPosition.y));
            checkCollisions(currentPosition.x, currentPosition.y);
        }
    }
    
    lastMousePosition = currentPosition;
});

function checkCollisions(x, y) {
    fruits.forEach(fruit => {
        if (!fruit.sliced) {
            const dx = x - fruit.x;
            const dy = y - fruit.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < fruit.size / 2) {
                if (fruit.isBomb) {
                    gameOver = true;
                } else {
                    fruit.slice();
                }
            }
        }
    });
}

function restartGame() {
    fruits = [];
    score = 0;
    swipeTrail = [];
    particles = [];
    bladeTrail = [];
    gameOver = false;
    document.getElementById("score").innerText = "Score: 0";
    animate();
}

// Add CSS for score popup
const style = document.createElement('style');
style.textContent = `
.score-popup {
    position: absolute;
    color: #fff;
    font-size: 24px;
    font-weight: bold;
    pointer-events: none;
    animation: popup 1s ease-out;
    text-shadow: 0 0 5px #000;
    z-index: 1000;
}

@keyframes popup {
    0% { transform: scale(0.5); opacity: 0; }
    50% { transform: scale(1.5); opacity: 1; }
    100% { transform: scale(1); opacity: 0; transform: translateY(-50px); }
}

#gameCanvas {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
}

#score {
    position: absolute;
    top: 20px;
    right: 20px;
    font-size: 24px;
    color: white;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    z-index: 2;
}

#gameOver {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 48px;
    color: white;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    z-index: 3;
    display: none;
}
`;
document.head.appendChild(style);

// Create a separator line at the bottom
function createSeparatorLine() {
    const separator = document.createElement('div');
    separator.id = 'game-separator';
    separator.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background: linear-gradient(90deg, 
            transparent 0%, 
            #00ff00 20%, 
            #00ff88 50%, 
            #00ff00 80%, 
            transparent 100%
        );
        box-shadow: 0 0 10px #00ff00,
                   0 0 20px #00ff00,
                   0 0 30px #00ff00;
        animation: breathe 2s ease-in-out infinite;
        z-index: 1001;
    `;

    // Add the animation keyframes
    const breatheStyle = document.createElement('style');
    breatheStyle.textContent = `
        @keyframes breathe {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
        }
    `;
    document.head.appendChild(breatheStyle);
    document.body.appendChild(separator);
}

// Adjust spawn rate based on screen size
const spawnInterval = Math.max(500, Math.min(1000, window.innerWidth / 2));
setInterval(spawnFruit, spawnInterval);

// Create separator line
createSeparatorLine();

// Start the game
animate();