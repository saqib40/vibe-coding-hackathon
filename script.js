// Game variables
let scene, camera, renderer, playerCar, roadGroup1, roadGroup2;
let gameStarted = false;
let gameOver = false;
let score = 0;
let speed = 10;
let lane = 1;
let enemyCars = [];
let animationId;
let lastEnemySpawnTime = 0;
let spawnInterval = 1500;
let roadLength = 300;
let laneWidth = 4;
const clock = new THREE.Clock();

// DOM elements (unchanged)
const gameOverScreen = document.getElementById('game-over');
const restartButton = document.getElementById('restart-button');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('final-score');
const canvas = document.getElementById('game-canvas');
const speedDisplay = document.getElementById('speed');

// Initialize Three.js scene
function initThree() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, -10);
    camera.lookAt(0, 0, 10);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);
    
    // Create geometries and materials for reuse
    carGeometry = new THREE.BoxGeometry(2, 1, 4);
    carMaterial = new THREE.MeshPhongMaterial({color: 0x0000ff}); // Blue for player
    enemyMaterial = new THREE.MeshPhongMaterial({color: 0xff0000}); // Red for enemies
    
    // Create road groups instead of a single road
    roadGroup1 = createRoadGroup();
    roadGroup1.position.z = 0;
    scene.add(roadGroup1);
    
    roadGroup2 = createRoadGroup();
    roadGroup2.position.z = roadLength;
    scene.add(roadGroup2);
    
    // Create player car
    createPlayerCar();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start the game immediately
    startGame();
}

// Create a road group (road, dividers, barriers)
function createRoadGroup() {
    const group = new THREE.Group();
    
    // Create road
    const roadGeometry = new THREE.PlaneGeometry(laneWidth * 3, roadLength);
    const roadMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333, // Dark gray
        side: THREE.DoubleSide
    });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.5, roadLength / 2);
    road.receiveShadow = true;
    group.add(road);
    
    // Add lane markers
    for (let i = -1; i <= 1; i += 2) {
        const dividerGeometry = new THREE.PlaneGeometry(0.2, roadLength);
        const dividerMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff, // White
            side: THREE.DoubleSide
        });
        const divider = new THREE.Mesh(dividerGeometry, dividerMaterial);
        divider.rotation.x = -Math.PI / 2;
        divider.position.set(i * laneWidth / 2, -0.49, roadLength / 2);
        group.add(divider);
    }
    
    // Add side barriers
    for (let i = -1; i <= 1; i += 2) {
        const barrierGeometry = new THREE.BoxGeometry(0.5, 1, roadLength);
        const barrierMaterial = new THREE.MeshPhongMaterial({
            color: 0xffcc00 // Yellow
        });
        const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        barrier.position.set(i * (laneWidth * 1.5 + 0.25), 0, roadLength / 2);
        barrier.receiveShadow = true;
        barrier.castShadow = true;
        group.add(barrier);
    }
    
    return group;
}

// Create ground (unchanged, added to scene directly)
function createGround() {
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshPhongMaterial({
        color: 0x339933, // Green
        side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.55, 0);
    scene.add(ground);
}

// Create player car (replacing the old function)
// (sports car design)
function createPlayerCar() {
    playerCar = new THREE.Group();
    
    // Main chassis
    const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 4);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff }); // Blue
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, 0.4, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    playerCar.add(body);
    
    // Hood (sloped front)
    const hoodGeometry = new THREE.BoxGeometry(1.8, 0.4, 1.5);
    const hood = new THREE.Mesh(hoodGeometry, bodyMaterial);
    hood.position.set(0, 0.2, 1.75);
    hood.rotation.x = -Math.PI / 6; // Tilt for sporty look
    hood.castShadow = true;
    hood.receiveShadow = true;
    playerCar.add(hood);
    
    // Cabin (cockpit)
    const cabinGeometry = new THREE.BoxGeometry(1.6, 0.6, 1.2);
    const cabinMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 }); // Dark gray for windows
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(0, 0.7, 0.3);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    playerCar.add(cabin);
    
    // Wheels (four cylinders)
    const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16);
    const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x111111 }); // Nearly black
    for (let i = 0; i < 4; i++) {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(
            (i % 2 === 0 ? -1 : 1) * 1.1, // Left or right
            0.2,                         // Height
            (i < 2 ? 1 : -1) * 1.2      // Front or back
        );
        wheel.castShadow = true;
        wheel.receiveShadow = true;
        playerCar.add(wheel);
    }
    
    // Headlights
    const headlightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const headlightMaterial = new THREE.MeshPhongMaterial({ color: 0xffffcc, emissive: 0xffffcc });
    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.position.set(-0.8, 0.2, 2.2);
    playerCar.add(leftHeadlight);
    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.position.set(0.8, 0.2, 2.2);
    playerCar.add(rightHeadlight);
    
    // Add the car group to the scene
    scene.add(playerCar);
}

// Create an enemy car (replacing the old function)
// Create an enemy car (truck-like design)
function spawnEnemyCar() {
    const enemyCar = new THREE.Group();
    
    // Main chassis (taller and wider)
    const enemyBodyGeometry = new THREE.BoxGeometry(2.5, 1.2, 4.5);
    const enemyBodyMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 }); // Red
    const enemyBody = new THREE.Mesh(enemyBodyGeometry, enemyBodyMaterial);
    enemyBody.position.set(0, 0.6, 0);
    enemyBody.castShadow = true;
    enemyBody.receiveShadow = true;
    enemyCar.add(enemyBody);
    
    // Cabin (taller, truck-like)
    const enemyCabinGeometry = new THREE.BoxGeometry(2, 1.5, 1.5);
    const enemyCabinMaterial = new THREE.MeshPhongMaterial({ color: 0x555555 }); // Darker gray
    const enemyCabin = new THREE.Mesh(enemyCabinGeometry, enemyCabinMaterial);
    enemyCabin.position.set(0, 1.35, 1.5);
    enemyCabin.castShadow = true;
    enemyCabin.receiveShadow = true;
    enemyCar.add(enemyCabin);
    
    // Wheels (six larger cylinders)
    const enemyWheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.5, 16);
    const enemyWheelMaterial = new THREE.MeshPhongMaterial({ color: 0x111111 });
    for (let i = 0; i < 6; i++) {
        const wheel = new THREE.Mesh(enemyWheelGeometry, enemyWheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(
            (i % 2 === 0 ? -1.3 : 1.3), // Left or right
            0.25,                      // Height
            (i < 2 ? 1.5 : i < 4 ? 0 : -1.5) // Front, middle, back
        );
        wheel.castShadow = true;
        wheel.receiveShadow = true;
        enemyCar.add(wheel);
    }
    
    // Taillights
    const taillightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const taillightMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xff0000 });
    const leftTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
    leftTaillight.position.set(-1.1, 0.6, -2.3);
    enemyCar.add(leftTaillight);
    const rightTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
    rightTaillight.position.set(1.1, 0.6, -2.3);
    enemyCar.add(rightTaillight);
    
    // Position and add to scene
    const enemyLane = Math.floor(Math.random() * 3) - 1;
    enemyCar.position.set(enemyLane * laneWidth, 0, 50);
    scene.add(enemyCar);
    enemyCars.push(enemyCar);
}

// Handle keyboard input
function handleKeyDown(event) {
    if (!gameOver) {
        if (event.key === 'ArrowLeft' && lane > -1) {
            lane--;
        } else if (event.key === 'ArrowRight' && lane < 1) {
            lane++;
        }
    }
}

// Update game state
function update(deltaTime) {
    if (gameOver) return;
    
    // Update player car position (smooth lane transition)
    const targetX = lane * laneWidth;
    playerCar.position.x += (targetX - playerCar.position.x) * 0.1;
    
    // Move road groups backwards
    roadGroup1.position.z -= speed * deltaTime;
    roadGroup2.position.z -= speed * deltaTime;
    
    // Loop road groups for infinite road
    if (roadGroup1.position.z < -roadLength) {
        roadGroup1.position.z += 2 * roadLength;
    }
    if (roadGroup2.position.z < -roadLength) {
        roadGroup2.position.z += 2 * roadLength;
    }
    
    // Update camera position to follow player
    camera.position.set(playerCar.position.x, 5, playerCar.position.z - 10);
    camera.lookAt(playerCar.position.x, 0, playerCar.position.z + 10);
    
    // Move enemy cars
    for (let i = enemyCars.length - 1; i >= 0; i--) {
        const enemyCar = enemyCars[i];
        enemyCar.position.z -= speed * deltaTime * 1.5; // Enemies move faster than road
        
        // Check if enemy car passed the player
        if (enemyCar.position.z < -10) {
            scene.remove(enemyCar);
            enemyCars.splice(i, 1);
            score += 10;
            updateScore();
        }
        
        // Check for collision
        if (checkCollision(playerCar, enemyCar)) {
            endGame();
            return;
        }
    }
    
    // Spawn new enemy cars
    const currentTime = Date.now();
    if (currentTime - lastEnemySpawnTime > spawnInterval) {
        spawnEnemyCar();
        lastEnemySpawnTime = currentTime;
        
        // Decrease spawn interval and increase speed over time
        if (spawnInterval > 600) {
            spawnInterval -= 50;
        }
        if (speed < 20) { // Adjusted max speed
            speed += 0.2; // Adjusted increment
        }
    }
    
    // Update score based on distance traveled
    score += speed * deltaTime; // Frame-rate independent scoring
    updateHUD();
}

// Check collision between two cars
function checkCollision(car1, car2) {
    const dx = Math.abs(car1.position.x - car2.position.x);
    const dz = Math.abs(car1.position.z - car2.position.z);
    return dx < 3 && dz < 5; // Adjusted thresholds
}

// Update score display
function updateHUD() {
    scoreDisplay.textContent = `Score: ${Math.floor(score)}`;
    speedDisplay.textContent = `Speed: ${Math.floor(speed)}`;
}

// End the game
function endGame() {
    gameOver = true;
    finalScoreDisplay.textContent = Math.floor(score);
    gameOverScreen.classList.remove('hidden');
    cancelAnimationFrame(animationId);
}

// Start the game
function startGame() {
    gameStarted = true;
    gameOver = false;
    score = 0;
    speed = 10; // Initial speed in units per second
    spawnInterval = 1500;
    lane = 0;
    
    // Remove any existing enemy cars
    for (const car of enemyCars) {
        scene.remove(car);
    }
    enemyCars = [];
    
    playerCar.position.set(0, 0, 0);
    roadGroup1.position.z = 0;
    roadGroup2.position.z = roadLength;
    gameOverScreen.classList.add('hidden');
    updateHUD();
    
    lastEnemySpawnTime = Date.now();
    animate();
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    const deltaTime = clock.getDelta();
    animationId = requestAnimationFrame(animate);
    update(deltaTime);
    renderer.render(scene, camera);
}

// Event listeners
document.addEventListener('keydown', handleKeyDown);
restartButton.addEventListener('click', startGame);

// Initialize the game
initThree();
createGround(); // Add ground separately after initThree