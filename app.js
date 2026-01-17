// Supabase Configuration
const SUPABASE_URL = 'https://iypezirwdlqpptjpeeyf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGV6aXJ3ZGxxcHB0anBlZXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Nzg3NzYsImV4cCI6MjA4NDI1NDc3Nn0.rfTN8fi9rd6o5rX-scAg9I1BbC-UjM8WoWEXDbrYJD4';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let taskStepCount = 0;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  // Set today's date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;
  
  // Add initial task steps
  addTaskStep();
  addTaskStep();
  addTaskStep();
});

// Add a task step
function addTaskStep() {
  taskStepCount++;
  const container = document.getElementById('taskStepsContainer');
  
  const stepDiv = document.createElement('div');
  stepDiv.className = 'task-step';
  stepDiv.id = 'step_' + taskStepCount;
  
  stepDiv.innerHTML = `
    <div class="task-step-header">
      <div class="step-number">${taskStepCount}</div>
      <button type="button" class="remove-btn" onclick="removeTaskStep(${taskStepCount})">Remove</button>
    </div>
    <div class="form-group">
      <label>Task Step</label>
      <input type="text" name="task_${taskStepCount}" placeholder="What will you do?">
    </div>
    <div class="form-group">
      <label>Potential Hazards</label>
      <input type="text" name="hazards_${taskStepCount}" placeholder="What could go wrong?">
    </div>
    <div class="form-group">
      <label>Controls / Mitigations</label>
      <input type="text" name="actions_${taskStepCount}" placeholder="How will you prevent injury?">
    </div>
  `;
  
  container.appendChild(stepDiv);
}

// Remove a task step
function removeTaskStep(id) {
  const step = document.getElementById('step_' + id);
  if (step && document.querySelectorAll('.task-step').length > 1) {
    step.remove();
    renumberSteps();
  }
}

// Renumber steps after removal
function renumberSteps() {
  const steps = document.querySelectorAll('.task-step');
  steps.forEach((step, index) => {
    step.querySelector('.step-number').textContent = index + 1;
  });
}

// Generate THA Number
function generateTHANumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0,10).replace(/-/g, '');
  const timeStr = now.getTime().toString().slice(-4);
  return 'THA-' + dateStr + '-' + timeStr;
}

// Get task steps from form
function getTaskSteps() {
  const steps = [];
  document.querySelectorAll('.task-step').forEach((stepDiv, index) => {
    const task = stepDiv.querySelector('input[name^="task_"]').value;
    const hazards = stepDiv.querySelector('input[name^="hazards_"]').value;
    const actions = stepDiv.querySelector('input[name^="actions_"]').value;
    
    if (task || hazards || actions) {
      steps.push({
        step_number: index + 1,
        task_step: task,
        potential_hazards: hazards,
        recommended_actions: actions
      });
    }
  });
  return steps;
}

// Form submission
document.getElementById('thaForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitBtn');
  const loading = document.getElementById('loading');
  const success = document.getElementById('success');
  
  submitBtn.disabled = true;
  submitBtn.style.display = 'none';
  loading.classList.add('visible');
  
  const thaNumber = generateTHANumber();
  const taskSteps = getTaskSteps();
  
  try {
    // Insert main THA record
    const { data: thaData, error: thaError } = await supabase
      .from('tha_submissions')
      .insert({
        tha_number: thaNumber,
        date: document.getElementById('date').value,
        company: document.getElementById('company').value,
        location: document.getElementById('location').value,
        crew_lead: document.getElementById('crewLead').value,
        task_description: document.getElementById('taskDescription').value,
        task_steps_count: taskSteps.length,
        status: 'Open'
      })
      .select();
    
    if (thaError) throw thaError;
    
    // Insert task steps
    if (taskSteps.length > 0) {
      const stepsWithTHA = taskSteps.map(step => ({
        ...step,
        tha_number: thaNumber
      }));
      
      const { error: stepsError } = await supabase
        .from('tha_task_steps')
        .insert(stepsWithTHA);
      
      if (stepsError) throw stepsError;
    }
    
    // Success!
    loading.classList.remove('visible');
    document.getElementById('thaNumber').textContent = thaNumber;
    success.classList.add('visible');
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error submitting THA: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.style.display = 'block';
    loading.classList.remove('visible');
  }
});

// Reset form
function resetForm() {
  document.getElementById('thaForm').reset();
  document.getElementById('success').classList.remove('visible');
  document.getElementById('submitBtn').style.display = 'block';
  document.getElementById('submitBtn').disabled = false;
  
  // Reset date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;
  
  // Reset task steps
  document.getElementById('taskStepsContainer').innerHTML = '';
  taskStepCount = 0;
  addTaskStep();
  addTaskStep();
  addTaskStep();
}
