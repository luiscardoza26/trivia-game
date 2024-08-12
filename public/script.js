// public/script.js

const socket = io();

const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const gameArea = document.getElementById('game-area');
const categoryElement = document.getElementById('category');
const questionElement = document.getElementById('question');
const optionsElement = document.getElementById('options');
const resultElement = document.getElementById('result');
const timerElement = document.getElementById('timer');
const scoresElement = document.getElementById('scores');

const categorySounds = {
    'Historia': document.getElementById('history-sound'),
    'Ciencia': document.getElementById('science-sound'),
    'Geografía': document.getElementById('geography-sound'),
    'Entretenimiento': document.getElementById('entertainment-sound')
};
const countdownSound = document.getElementById('countdown-sound');
const correctSound = document.getElementById('correct-sound');
const incorrectSound = document.getElementById('incorrect-sound');

let timeLeft = 30;
let timerInterval;
let currentCategorySound;
let gameStarted = false

startButton.addEventListener('click', () => {
    startGame();
});

function startGame() {
    gameStarted = true;
    startScreen.classList.add('hidden');
    gameArea.classList.remove('hidden');
    socket.emit('ready');
}

function playCategorySound(category) {
    if (currentCategorySound) {
        currentCategorySound.pause();
        currentCategorySound.currentTime = 0;
    }
    currentCategorySound = categorySounds[category];
    if (gameStarted) {
        currentCategorySound.play();
    }
}

socket.on('newQuestion', (questionData) => {
    if (!gameStarted) return;

    categoryElement.textContent = `Categoría: ${questionData.category}`;
    questionElement.textContent = questionData.question;
    optionsElement.innerHTML = '';
    resultElement.textContent = '';
    timeLeft = 30;

    playCategorySound(questionData.category);

    questionData.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.textContent = option;
        button.className = 'w-full p-4 text-lg font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors duration-300 transform hover:scale-105';
        button.onclick = () => submitAnswer(index);
        optionsElement.appendChild(button);
    });

    clearInterval(timerInterval);
    updateTimer();
});

socket.on('answerResult', (result) => {
    clearInterval(timerInterval);
    countdownSound.pause();
    countdownSound.currentTime = 0;

    if (result.correct) {
        resultElement.textContent = '¡Correcto!';
        resultElement.className = 'text-center font-bold text-xl text-green-500';
        correctSound.play();
    } else {
        resultElement.textContent = `Incorrecto. La respuesta correcta era: ${result.correctAnswer}`;
        resultElement.className = 'text-center font-bold text-xl text-red-500';
        incorrectSound.play();
    }
    optionsElement.querySelectorAll('button').forEach(button => {
        button.disabled = true;
        button.className += ' opacity-50 cursor-not-allowed';
    });
});

socket.on('updateScores', (scores) => {
    scoresElement.innerHTML = '';
    Object.entries(scores).forEach(([id, score]) => {
        const li = document.createElement('li');
        li.textContent = `Jugador ${id.substr(0, 4)}: ${score}`;
        li.className = 'mb-2 p-2 bg-white rounded shadow';
        scoresElement.appendChild(li);
    });
});

socket.on('gameOver', (finalScores) => {
    clearInterval(timerInterval);
    if (currentCategorySound) {
        currentCategorySound.pause();
        currentCategorySound.currentTime = 0;
    }
    countdownSound.pause();
    countdownSound.currentTime = 0;

    gameArea.innerHTML = `
        <div class="text-center">
            <h2 class="text-2xl font-bold mb-4">¡Juego terminado!</h2>
            <p class="mb-4">Todas las preguntas han sido respondidas.</p>
            <h3 class="text-xl font-semibold mb-2">Puntuaciones finales:</h3>
            <ul class="mb-4">
                ${Object.entries(finalScores).map(([id, score]) => `
                    <li class="mb-2">Jugador ${id.substr(0, 4)}: ${score}</li>
                `).join('')}
            </ul>
            <button id="restart-button" class="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-colors duration-300">
                Reiniciar juego
            </button>
        </div>
    `;

    document.getElementById('restart-button').addEventListener('click', () => {
        location.reload(); // Recarga la página para reiniciar el juego
    });
})

function submitAnswer(index) {
    socket.emit('submitAnswer', index);
    clearInterval(timerInterval);
    countdownSound.pause();
    countdownSound.currentTime = 0;
    optionsElement.querySelectorAll('button').forEach(button => {
        button.disabled = true;
        button.className += ' opacity-50 cursor-not-allowed';
    });
}

function updateTimer() {
    timerElement.textContent = `Tiempo restante: ${timeLeft}s`;
    if (timeLeft > 0) {
        timeLeft--;
        if (timeLeft <= 13) {
            if (countdownSound.paused) {
                countdownSound.play();
            }
            timerElement.className = 'text-center text-2xl font-bold text-red-500';
        } else {
            timerElement.className = 'text-center text-2xl font-bold text-gray-700';
        }
        timerInterval = setTimeout(updateTimer, 1000);
    } else {
        resultElement.textContent = 'Se acabó el tiempo';
        resultElement.className = 'text-center font-bold text-xl text-orange-500';
        optionsElement.querySelectorAll('button').forEach(button => {
            button.disabled = true;
            button.className += ' opacity-50 cursor-not-allowed';
        });
        countdownSound.pause();
        countdownSound.currentTime = 0;
    }
}

// Inicializar los sonidos
Object.values(categorySounds).forEach(sound => {
    sound.load();
});
countdownSound.load();
correctSound.load();
incorrectSound.load();
