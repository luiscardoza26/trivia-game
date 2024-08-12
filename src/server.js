// src/server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const questions = require('./questions');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));

let currentCategory = 0;
let currentQuestion = 0;
let scores = {};
let gameInProgress = false;
let totalQuestions = questions.reduce((total, category) => total + category.questions.length, 0);
let answeredQuestions = 0;

function getCurrentQuestion() {
  const category = questions[currentCategory];
  const question = category.questions[currentQuestion];
  
  return {
    category: category.category,
    ...question
  };
}

function getNextQuestion() {
  currentQuestion = (currentQuestion + 1) % questions[currentCategory].questions.length;
  if (currentQuestion === 0) {
    currentCategory = (currentCategory + 1) % questions.length;
  }
  answeredQuestions++;

  if (answeredQuestions >= totalQuestions) {
    return null; // Indica que todas las preguntas han sido respondidas
  }

  return getCurrentQuestion();
}

function startNewGame() {
  currentCategory = 0;
  currentQuestion = 0;
  scores = {};
  gameInProgress = true;
  io.emit('newQuestion', getCurrentQuestion());
}

io.on('connection', (socket) => {
  console.log('Nuevo usuario conectado');

    socket.on('ready', () => {
        // Reiniciar el juego para este socket
        currentCategory = 0;
        currentQuestion = 0;
        answeredQuestions = 0;
        scores = {};
        socket.emit('newQuestion', getCurrentQuestion());
    });

  if (!gameInProgress) {
    startNewGame();
  } else {
    socket.emit('newQuestion', getCurrentQuestion());
  }

  socket.on('submitAnswer', (answer) => {
    if (!gameInProgress) return;

    const currentQ = getCurrentQuestion();
    if (answer === currentQ.correctAnswer) {
      scores[socket.id] = (scores[socket.id] || 0) + 1;
      socket.emit('answerResult', { correct: true });
    } else {
      socket.emit('answerResult', { 
        correct: false, 
        correctAnswer: currentQ.options[currentQ.correctAnswer] 
      });
    }

    io.emit('updateScores', scores);

    setTimeout(() => {
      const nextQuestion = getNextQuestion();
      if (nextQuestion) {
        io.emit('newQuestion', nextQuestion);
      } else {
        gameInProgress = false;
        io.emit('gameOver', scores);
      }
    }, 3000);
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
    delete scores[socket.id];
    io.emit('updateScores', scores);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
