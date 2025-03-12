class ExamInterface {
  constructor() {
    // Check for existing config
    const config = JSON.parse(localStorage.getItem('examConfig'));
    if (!config) {
      window.location.href = 'index.html';
      return;
    }

    // Initialize properties
    this.initializeProperties(config);
    this.initializeInterface();
    this.attachEventListeners();
    this.updateQuestionGrid();
    this.updateTimer();
  }

  initializeProperties(config) {
    this.totalQuestions = config.questionCount;
    this.timeNeeded = config.timeNeeded;
    this.timeRemaining = this.timeNeeded * 60;
    this.allowCustomEdit = config.allowCustomEdit;
    this.candidateInfo = {
      name: config.candidateName,
      exam: config.examName,
      subject: config.subject
    };
    this.currentQuestion = null;
    this.timerInterval = null;
    this.isPaused = true;
    this.answers = new Map();
    this.questionType = 'mcq';
    this.questionStartTime = null;
    this.calculator = {
      display: '',
      firstOperand: null,
      waitingForSecondOperand: false,
      operator: null
    };
  }

  initializeInterface() {
    this.initializeElements();
    this.createCandidateInfo();
    
    // Hide edit controls if not allowed
    if (!this.allowCustomEdit) {
      document.getElementById('editTimer').style.display = 'none';
      document.getElementById('addQuestion').style.display = 'none';
    }
  }

  initializeElements() {
    this.elements = {
      timer: document.getElementById('timer'),
      questionGrid: document.getElementById('questionGrid'),
      selectedQuestion: document.getElementById('selectedQuestion'),
      options: document.getElementById('options'),
      natInput: document.getElementById('natInput'),
      pdfPreview: document.getElementById('pdfPreview'),
      uploadPdf: document.getElementById('uploadPdf'),
      mcqButton: document.getElementById('mcqButton'),
      msqButton: document.getElementById('msqButton'),
      natButton: document.getElementById('natButton'),
      calculatorModal: document.getElementById('calculatorModal'),
      calculatorDisplay: document.getElementById('calculatorDisplay'),
      numericalAnswer: document.getElementById('numericalAnswer')
    };
  }

  createCandidateInfo() {
    const infoHtml = `
      <div class="candidate-info">
        <div class="info-item">
          <label>Candidate Name</label>
          <span>${this.candidateInfo.name}</span>
        </div>
        <div class="info-item">
          <label>Exam</label>
          <span>${this.candidateInfo.exam}</span>
        </div>
        <div class="info-item">
          <label>Subject</label>
          <span>${this.candidateInfo.subject}</span>
        </div>
      </div>
    `;
    document.querySelector('.main-content').insertAdjacentHTML('afterbegin', infoHtml);
  }

  attachEventListeners() {
    // Timer controls
    document.getElementById('startTimer').addEventListener('click', () => this.startTimer());
    document.getElementById('pauseTimer').addEventListener('click', () => this.pauseTimer());
    document.getElementById('resetTimer').addEventListener('click', () => this.resetTimer());
    document.getElementById('editTimer').addEventListener('click', () => this.editTimer());

    // Action buttons
    document.getElementById('saveNext').addEventListener('click', () => this.saveAndNext());
    document.getElementById('clear').addEventListener('click', () => this.clearResponse());
    document.getElementById('saveReview').addEventListener('click', () => this.saveAndMarkForReview());
    document.getElementById('markReviewNext').addEventListener('click', () => this.markForReviewAndNext());
    document.getElementById('submitExam').addEventListener('click', () => this.submitExam());
    document.getElementById('addQuestion').addEventListener('click', () => this.addQuestion());

    // Question type controls
    this.elements.mcqButton.addEventListener('click', () => this.setQuestionType('mcq'));
    this.elements.msqButton.addEventListener('click', () => this.setQuestionType('msq'));
    this.elements.natButton.addEventListener('click', () => this.setQuestionType('nat'));

    // PDF upload
    this.elements.uploadPdf.addEventListener('change', (event) => this.handlePdfUpload(event));
    
    // Calculator modal close button
    document.getElementById('calculatorBtn').addEventListener('click', () => this.openCalculator());
    document.querySelector('.close-modal').addEventListener('click', () => this.closeCalculator());

    // Add radio button event listeners for angle mode
    document.getElementsByName('angle').forEach(radio => {
    radio.addEventListener('change', (e) => {
    this.calculatorState.angleMode = e.target.value;
    });
  });
  }

  updateTimer() {
    const hours = Math.floor(this.timeRemaining / 3600);
    const minutes = Math.floor((this.timeRemaining % 3600) / 60);
    const seconds = this.timeRemaining % 60;
    
    this.elements.timer.textContent = `Time Remaining: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    if (this.timeRemaining <= 300) {
      this.elements.timer.classList.add('warning');
    }
  }

  startTimer() {
    if (this.isPaused) {
      this.isPaused = false;
      this.timerInterval = setInterval(() => {
        if (this.timeRemaining <= 0) {
          this.submitExam();
          return;
        }
        this.timeRemaining--;
        this.updateTimer();
      }, 1000);
    }
  }

  pauseTimer() {
    this.isPaused = true;
    clearInterval(this.timerInterval);
  }

  resetTimer() {
    this.pauseTimer();
    this.timeRemaining = this.timeNeeded * 60;
    this.updateTimer();
  }

  editTimer() {
    if (!this.allowCustomEdit) return;
    
    this.pauseTimer();
    const newTime = prompt("Enter time in seconds:", this.timeRemaining);
    if (newTime && !isNaN(newTime) && newTime > 0) {
      this.timeRemaining = parseInt(newTime);
      this.updateTimer();
    }
  }

  openCalculator() {
  if (!document.getElementById('calculatorModal')) {
    console.error("Calculator modal element not found");
    return;
  }
  this.elements.calculatorModal.classList.add('active', 'floating-modal');
  document.body.classList.add('calculator-open');
  
  // Position the calculator
  const calculatorWindow = document.querySelector('.calculator-window');
  if (!calculatorWindow) {
    console.error("Calculator window element not found");
    return;
  }
  calculatorWindow.style.left = '50%';
  calculatorWindow.style.top = '100px';
  calculatorWindow.style.transform = 'translateX(-50%)';
  
  if (!this.calculatorInitialized) {
    this.initializeCalculator();
    this.calculatorInitialized = true;
  }
  
  // Make calculator draggable
  this.makeDraggable(calculatorWindow);
}

closeCalculator() {
  this.elements.calculatorModal.classList.remove('active');
  document.body.classList.remove('calculator-open');
}

minimizeCalculator() {
  const calculatorWindow = document.querySelector('.calculator-window');
  calculatorWindow.classList.toggle('minimized');
}

makeDraggable(element) {
  const calculatorHeader = element.querySelector('.calculator-header');
  const calculatorContainer = element.querySelector('.calculator-container');
  
  if (!calculatorHeader || !calculatorContainer) {
    console.error("Calculator header or container not found");
    return;
  }
  
  let isDragging = false;
  let offsetX, offsetY;
  
  calculatorHeader.addEventListener('mousedown', function(e) {
    isDragging = true;
    offsetX = e.clientX - calculatorContainer.getBoundingClientRect().left;
    offsetY = e.clientY - calculatorContainer.getBoundingClientRect().top;
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    calculatorContainer.style.position = 'absolute';
    calculatorContainer.style.left = (e.clientX - offsetX) + 'px';
    calculatorContainer.style.top = (e.clientY - offsetY) + 'px';
  });
  
  document.addEventListener('mouseup', function() {
    isDragging = false;
  });
}
  
  initializeCalculator() {
    const calculatorDisplay = document.getElementById('calculatorDisplay');
    const expressionDisplay = document.getElementById('calculatorExpression');
    
    // Add event listeners for calculator buttons
    document.querySelectorAll('.calculator-keys button').forEach(button => {
      button.addEventListener('click', () => {
        const buttonType = Object.keys(button.dataset)[0];
        const buttonValue = button.dataset[buttonType];
        
        this.handleCalculatorInput(buttonType, buttonValue, calculatorDisplay, expressionDisplay);
      });
    });
    
    // Handle minimize and close buttons
    document.querySelector('.minimize-btn').addEventListener('click', function() {
      const calcBody = document.querySelector('.calculator-body');
      const displayContainer = document.querySelector('.display-container');
      
      if (calcBody.style.display === 'none') {
        calcBody.style.display = 'block';
        displayContainer.style.display = 'block';
      } else {
        calcBody.style.display = 'none';
        displayContainer.style.display = 'none';
      }
    });
    
    // Scientific calculator functions
    this.calculatorState = {
      currentValue: '0',
      expression: '',
      memory: 0,
      lastOperation: null,
      angleMode: 'deg' // 'deg' or 'rad'
    };
  }
  
  handleCalculatorInput(type, value, display, expressionDisplay) {
    const state = this.calculatorState;
    
    // Convert degrees to radians if needed
    const toRadians = (degrees) => {
      return state.angleMode === 'deg' ? degrees * (Math.PI / 180) : degrees;
    };
    
    // Convert radians to degrees if needed
    const toDegrees = (radians) => {
      return state.angleMode === 'deg' ? radians * (180 / Math.PI) : radians;
    };
    
    switch(type) {
      case 'number':
        if (state.currentValue === '0' || state.waitingForOperand) {
          state.currentValue = value;
          state.waitingForOperand = false;
        } else {
          state.currentValue += value;
        }
        break;
        
      case 'operation':
        if (value === '=') {
          try {
            state.expression += state.currentValue;
            expressionDisplay.value = state.expression;
            // Replace spaces before evaluating
            const cleanExpression = state.expression.replace(/\s+/g, '');
            state.currentValue = eval(cleanExpression).toString();
            state.expression = '';
          } catch (e) {
            state.currentValue = 'Error';
            console.error("Calculator evaluation error:", e);
          }
        }
        break;
        
      case 'action':
        switch(value) {
          case 'clear':
            state.currentValue = '0';
            state.expression = '';
            expressionDisplay.value = '';
            break;
            
          case 'backspace':
            if (state.currentValue.length > 1) {
              state.currentValue = state.currentValue.slice(0, -1);
            } else {
              state.currentValue = '0';
            }
            break;
            
          case 'sign':
            state.currentValue = (parseFloat(state.currentValue) * -1).toString();
            break;
            
          case 'left-parenthesis':
            if (state.currentValue === '0' || state.waitingForOperand) {
              state.expression += '(';
            } else {
              state.expression += state.currentValue + ' * (';
              state.waitingForOperand = true;
            }
            expressionDisplay.value = state.expression;
            break;
            
          case 'right-parenthesis':
            state.expression += state.currentValue + ')';
            expressionDisplay.value = state.expression;
            state.waitingForOperand = true;
            break;
            
          // Memory operations
          case 'mc':
            state.memory = 0;
            break;
            
          case 'mr':
            state.currentValue = state.memory.toString();
            break;
            
          case 'ms':
            state.memory = parseFloat(state.currentValue);
            state.waitingForOperand = true;
            break;
            
          case 'm-plus':
            state.memory += parseFloat(state.currentValue);
            state.waitingForOperand = true;
            break;
            
          case 'm-minus':
            state.memory -= parseFloat(state.currentValue);
            state.waitingForOperand = true;
            break;
        }
        break;
        
      case 'function':
        const current = parseFloat(state.currentValue);
        switch(value) {
          case 'sqrt':
            state.currentValue = Math.sqrt(current).toString();
            break;
            
          case 'square':
            state.currentValue = (current * current).toString();
            break;
            
          case 'cube':
            state.currentValue = (current * current * current).toString();
            break;
            
          case 'reciproc':
            if (current !== 0) {
              state.currentValue = (1 / current).toString();
            } else {
              state.currentValue = 'Error';
            }
            break;
            
          case 'sin':
            state.currentValue = Math.sin(toRadians(current)).toString();
            break;
            
          case 'cos':
            state.currentValue = Math.cos(toRadians(current)).toString();
            break;
            
          case 'tan':
            state.currentValue = Math.tan(toRadians(current)).toString();
            break;
            
          case 'asin':
            state.currentValue = toDegrees(Math.asin(current)).toString();
            break;
            
          case 'acos':
            state.currentValue = toDegrees(Math.acos(current)).toString();
            break;
            
          case 'atan':
            state.currentValue = toDegrees(Math.atan(current)).toString();
            break;
            
          case 'sinh':
            state.currentValue = Math.sinh(current).toString();
            break;
            
          case 'cosh':
            state.currentValue = Math.cosh(current).toString();
            break;
            
          case 'tanh':
            state.currentValue = Math.tanh(current).toString();
            break;
            
          case 'asinh':
            state.currentValue = Math.asinh(current).toString();
            break;
            
          case 'acosh':
            state.currentValue = Math.acosh(current).toString();
            break;
            
          case 'atanh':
            state.currentValue = Math.atanh(current).toString();
            break;
            
          case 'ln':
            state.currentValue = Math.log(current).toString();
            break;
            
          case 'log':
            state.currentValue = Math.log10(current).toString();
            break;
            
          case 'log2':
            state.currentValue = Math.log2(current).toString();
            break;
            
          case 'factorial':
            let result = 1;
            for (let i = 2; i <= current; i++) {
              result *= i;
            }
            state.currentValue = result.toString();
            break;
            
          case 'abs':
            state.currentValue = Math.abs(current).toString();
            break;
        }
        break;
        
      case 'constant':
        switch(value) {
          case 'pi':
            state.currentValue = Math.PI.toString();
            break;
            
          case 'e':
            state.currentValue = Math.E.toString();
            break;
        }
        break;
    }
    
    // Update display
    display.value = state.currentValue;
  }

  setQuestionType(type) {
    this.questionType = type;
    
    // Update button styles
    this.elements.mcqButton.classList.remove('active');
    this.elements.msqButton.classList.remove('active');
    this.elements.natButton.classList.remove('active');
    document.getElementById(`${type}Button`).classList.add('active');
    
    // Show/hide appropriate input based on type
    if (type === 'nat') {
      this.elements.options.style.display = 'none';
      this.elements.natInput.style.display = 'block';
    } else {
      this.elements.options.style.display = 'flex';
      this.elements.natInput.style.display = 'none';
      this.updateOptionsForType(type);
    }
    
    // Restore any saved answers for current question
    if (this.currentQuestion && this.answers.has(this.currentQuestion)) {
      this.restoreAnswer();
    }
  }

  updateOptionsForType(type) {
    const options = ['a', 'b', 'c', 'd'];
    const inputType = type === 'mcq' ? 'radio' : 'checkbox';
    
    // Clear existing options
    this.elements.options.innerHTML = '';
    
    // Create new options with correct input type
    options.forEach(value => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = inputType;
      input.name = type === 'mcq' ? 'option' : `option-${value}`;
      input.value = value;
      
      label.appendChild(input);
      label.appendChild(document.createTextNode(` ${value.toUpperCase()} `));
      this.elements.options.appendChild(label);
    });

    // Restore any saved answers for current question
    this.restoreAnswer();
  }

  restoreAnswer() {
    if (!this.currentQuestion || !this.answers.has(this.currentQuestion)) return;
    
    const answer = this.answers.get(this.currentQuestion);
    
    if (answer.type === 'nat') {
      this.elements.numericalAnswer.value = answer.value;
    } else {
      const inputs = this.elements.options.querySelectorAll('input');
      inputs.forEach(input => {
        input.checked = answer.value.includes(input.value);
      });
    }
  }

  selectQuestion(questionNumber, button) {
    // Update current selection
    const currentButton = this.elements.questionGrid.querySelector('.current');
    if (currentButton) {
      currentButton.classList.remove('current');
    }

    // Store start time for new question
    this.questionStartTime = new Date();
    
    // Update current question
    this.currentQuestion = questionNumber;
    button.classList.add('current');
    
    // Update question display
    this.elements.selectedQuestion.textContent = `Question ${questionNumber}`;
    
    // Update status if not visited
    if (button.classList.contains('not-visited')) {
      button.classList.remove('not-visited');
      button.classList.add('not-answered');
    }

    // Restore saved answer if exists
    const savedAnswer = this.answers.get(questionNumber);
    if (savedAnswer) {
      // Set question type based on saved answer
      this.setQuestionType(savedAnswer.type);
    } else {
      // Default to MCQ if no saved answer
      this.setQuestionType('mcq');
    }
  }

  clearResponse() {
    if (!this.currentQuestion) {
      alert('Please select a question first');
      return;
    }

    // Clear selected options or numerical input based on question type
    if (this.questionType === 'nat') {
      this.elements.numericalAnswer.value = '';
    } else {
      const inputs = this.elements.options.querySelectorAll('input');
      inputs.forEach(input => input.checked = false);
    }

    // Update question status
    const currentButton = this.elements.questionGrid.querySelector('.current');
    currentButton.classList.remove('answered', 'saved-review');
    currentButton.classList.add('not-answered');

    // Remove from answers map
    this.answers.delete(this.currentQuestion);
  }

  updateQuestionGrid() {
    this.elements.questionGrid.innerHTML = '';
    for (let i = 1; i <= this.totalQuestions; i++) {
      const button = document.createElement('button');
      button.textContent = i;
      button.addEventListener('click', () => this.selectQuestion(i, button));
      
      // Set initial state
      if (this.answers.has(i)) {
        const answer = this.answers.get(i);
        button.classList.add(answer.status);
      } else {
        button.classList.add('not-visited');
      }
      
      this.elements.questionGrid.appendChild(button);
    }
  }

  getSelectedAnswer() {
    if (this.questionType === 'nat') {
      const value = this.elements.numericalAnswer.value.trim();
      if (value === '') {
        return null;
      }
      return [value];
    } else {
      const selectedOptions = Array.from(this.elements.options.querySelectorAll('input'))
        .filter(input => input.checked)
        .map(input => input.value);
      
      if (selectedOptions.length === 0) {
        return null;
      }
      return selectedOptions;
    }
  }

  saveAndNext() {
    if (!this.currentQuestion) {
      alert('Please select a question first');
      return;
    }

    const selectedOptions = this.getSelectedAnswer();
    if (!selectedOptions) {
      alert('Please provide an answer');
      return;
    }

    // Calculate time spent
    const timeSpent = new Date() - this.questionStartTime;

    // Save answer with metadata
    this.answers.set(this.currentQuestion, {
      value: selectedOptions,
      type: this.questionType,
      status: 'answered',
      timeSpent: timeSpent
    });

    // Update button status
    const currentButton = this.elements.questionGrid.querySelector('.current');
    currentButton.classList.remove('not-answered', 'not-visited', 'marked-review', 'saved-review');
    currentButton.classList.add('answered');

    // Move to next question
    const nextQuestion = this.currentQuestion < this.totalQuestions ? this.currentQuestion + 1 : null;
    if (nextQuestion) {
      const nextButton = this.elements.questionGrid.children[nextQuestion - 1];
      this.selectQuestion(nextQuestion, nextButton);
    } else {
      alert('You have reached the last question');
    }
  }

  saveAndMarkForReview() {
    if (!this.currentQuestion) {
      alert('Please select a question first');
      return;
    }

    const selectedOptions = Array.from(this.elements.options.querySelectorAll('input'))
      .filter(input => input.checked)
      .map(input => input.value);

    if (selectedOptions.length === 0) {
      alert('Please select an answer before marking for review');
      return;
    }

    // Calculate time spent
    const timeSpent = new Date() - this.questionStartTime;

    // Save answer with review status
    this.answers.set(this.currentQuestion, {
      value: selectedOptions,
      status: 'saved-review',
      timeSpent: timeSpent
    });

    // Update button status
    const currentButton = this.elements.questionGrid.querySelector('.current');
    currentButton.classList.remove('not-answered', 'not-visited', 'answered', 'marked-review');
    currentButton.classList.add('saved-review');

    // Move to next question
    const nextQuestion = this.currentQuestion < this.totalQuestions ? this.currentQuestion + 1 : null;
    if (nextQuestion) {
      const nextButton = this.elements.questionGrid.children[nextQuestion - 1];
      this.selectQuestion(nextQuestion, nextButton);
    }
  }

  markForReviewAndNext() {
    if (!this.currentQuestion) {
      alert('Please select a question first');
      return;
    }

    // Calculate time spent even if no answer selected
    const timeSpent = new Date() - this.questionStartTime;

    // Mark for review without requiring an answer
    this.answers.set(this.currentQuestion, {
      value: [],
      status: 'marked-review',
      timeSpent: timeSpent
    });

    // Update button status
    const currentButton = this.elements.questionGrid.querySelector('.current');
    currentButton.classList.remove('not-answered', 'not-visited', 'answered', 'saved-review');
    currentButton.classList.add('marked-review');

    // Move to next question
    const nextQuestion = this.currentQuestion < this.totalQuestions ? this.currentQuestion + 1 : null;
    if (nextQuestion) {
      const nextButton = this.elements.questionGrid.children[nextQuestion - 1];
      this.selectQuestion(nextQuestion, nextButton);
    }
  }

  generateSubmissionSummary() {
    const summary = {
      answeredCount: 0,
      notAnsweredCount: 0,
      markedReviewCount: 0,
      savedReviewCount: 0,
      notVisitedCount: 0
    };

    for (let i = 1; i <= this.totalQuestions; i++) {
      const answer = this.answers.get(i);
      if (!answer) {
        summary.notVisitedCount++;
      } else {
        switch (answer.status) {
          case 'answered':
            summary.answeredCount++;
            break;
          case 'marked-review':
            summary.markedReviewCount++;
            break;
          case 'saved-review':
            summary.savedReviewCount++;
            break;
          default:
            summary.notAnsweredCount++;
        }
      }
    }

    return summary;
  }

  submitExam() {
    const summary = this.generateSubmissionSummary();
    const unansweredTotal = summary.notAnsweredCount + summary.notVisitedCount + 
                          summary.markedReviewCount;

    if (unansweredTotal > 0) {
      const confirmMessage = `
        Summary before submission:
        - Answered: ${summary.answeredCount}
        - Saved & Marked for Review: ${summary.savedReviewCount}
        - Not Answered/Not Visited: ${unansweredTotal}

        Are you sure you want to submit the exam?
      `;
      
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    // Stop timer
    this.pauseTimer();
    
    // Calculate exam duration and timestamps
    const endDate = new Date();
    const totalDuration = (this.timeNeeded * 60) - this.timeRemaining;
    const startDate = new Date(endDate.getTime() - (totalDuration * 1000));

    // Prepare submission data
    const submissionData = {
      candidateInfo: this.candidateInfo,
      examMetadata: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalDuration,
        timeRemaining: this.timeRemaining
      },
      answers: Array.from(this.answers.entries()).map(([questionNumber, answer]) => ({
        questionNumber,
        selectedOptions: answer.value,
        status: answer.status,
        timeSpent: answer.timeSpent || 0
      })),
      summary
    };

    // Generate CSV data
    this.generateAndDownloadCSV(submissionData);

    // In a real application, send data to server
    console.log('Exam submitted:', submissionData);

    // Disable interface
    this.disableInterface();
    
    alert('Exam submitted successfully! Your response sheet has been downloaded.');
  }

  generateAndDownloadCSV(submissionData) {
    const csvRows = [
      ['Exam Response Sheet'],
      [''],
      ['Candidate Information'],
      ['Name', submissionData.candidateInfo.name],
      ['Exam', submissionData.candidateInfo.exam],
      ['Subject', submissionData.candidateInfo.subject],
      [''],
      ['Exam Details'],
      ['Start Time', submissionData.examMetadata.startDate],
      ['End Time', submissionData.examMetadata.endDate],
      ['Total Duration (seconds)', submissionData.examMetadata.totalDuration],
      [''],
      ['Response Summary'],
      ['Total Questions', this.totalQuestions],
      ['Answered', submissionData.summary.answeredCount],
      ['Saved & Marked for Review', submissionData.summary.savedReviewCount],
      ['Marked for Review', submissionData.summary.markedReviewCount],
      ['Not Answered', submissionData.summary.notAnsweredCount],
      ['Not Visited', submissionData.summary.notVisitedCount],
      [''],
      ['Detailed Responses'],
      ['Question Number', 'Selected Options', 'Status', 'Time Spent (ms)']
    ];

    // Add individual question responses
    submissionData.answers.forEach(answer => {
      csvRows.push([
        answer.questionNumber,
        answer.selectedOptions.join(';'),
        answer.status,
        answer.timeSpent
      ]);
    });

    // Convert to CSV string
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Exam_Response_${Date.now()}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  handlePdfUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      event.target.value = '';
      return;
    }

    // Create object URL and display PDF
    const fileURL = URL.createObjectURL(file);
    this.elements.pdfPreview.innerHTML = `
      <iframe src="${fileURL}#toolbar=0" title="PDF Preview"></iframe>
    `;

    // Clean up the object URL when the iframe loads
    const iframe = this.elements.pdfPreview.querySelector('iframe');
    iframe.onload = () => URL.revokeObjectURL(fileURL);
  }

  disableInterface() {
    // Disable all interactive elements
    const elements = document.querySelectorAll('button, input, select');
    elements.forEach(element => element.disabled = true);
    
    // Remove event listeners from question grid
    const questionButtons = this.elements.questionGrid.querySelectorAll('button');
    questionButtons.forEach(button => {
      button.replaceWith(button.cloneNode(true));
    });
    
    // Stop timer
    this.pauseTimer();
    clearInterval(this.timerInterval);
  }

  addQuestion() {
    if (!this.allowCustomEdit) return;
    
    this.totalQuestions++;
    this.updateQuestionGrid();
  }
}

// Initialize the exam interface when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const examInterface = new ExamInterface();
});