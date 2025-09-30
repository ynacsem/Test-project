const { pool, initializeDb } = require('./db');

const mockedDiagnoses = [
  {
    client_id: '550e8400-e29b-41d4-a716-446655440001',
    diagnosis_name: 'Generalized Anxiety Disorder',
    justification: 'Patient exhibits persistent excessive worry about multiple life events, difficulty controlling worry, restlessness, fatigue, difficulty concentrating, irritability, muscle tension, and sleep disturbance for more than 6 months. Symptoms cause significant distress and impairment in social and occupational functioning.',
    challenged_diagnosis: null,
    challenged_justification: null
  },
  {
    client_id: '550e8400-e29b-41d4-a716-446655440002', 
    diagnosis_name: 'Major Depressive Disorder',
    justification: 'Patient reports depressed mood most of the day, markedly diminished interest in activities, significant weight loss, insomnia, psychomotor agitation, fatigue, feelings of worthlessness, diminished concentration, and recurrent thoughts of death for over 2 weeks. Symptoms represent a change from previous functioning.',
    challenged_diagnosis: 'Adjustment Disorder with Depressed Mood',
    challenged_justification: 'Symptoms appeared following recent job loss and divorce. Duration and severity may be better explained by adjustment disorder rather than major depression. Consider psychosocial stressors and timeline of symptom onset.'
  },
  {
    client_id: '550e8400-e29b-41d4-a716-446655440003',
    diagnosis_name: 'Social Anxiety Disorder', 
    justification: 'Patient experiences marked fear and anxiety in social situations where they may be scrutinized by others, including fear of negative evaluation, embarrassment, and humiliation. Avoids social interactions and public speaking. Symptoms persist for over 6 months and cause significant impairment.',
    challenged_diagnosis: null,
    challenged_justification: null
  },
  {
    client_id: '550e8400-e29b-41d4-a716-446655440004',
    diagnosis_name: 'Attention-Deficit/Hyperactivity Disorder',
    justification: 'Patient demonstrates persistent inattention including difficulty sustaining attention, careless mistakes, difficulty organizing tasks, avoids tasks requiring sustained mental effort, loses things, easily distracted, and forgetful. Symptoms present since childhood and cause impairment in multiple settings.',
    challenged_diagnosis: 'Adult ADHD vs Anxiety-Related Concentration Issues',
    challenged_justification: 'While ADHD symptoms are present, patient also reports high anxiety levels. Concentration difficulties may be secondary to anxiety rather than primary ADHD. Recommend anxiety treatment trial before confirming ADHD diagnosis.'
  },
  {
    client_id: '550e8400-e29b-41d4-a716-446655440005',
    diagnosis_name: 'Post-Traumatic Stress Disorder',
    justification: 'Patient experienced traumatic event involving actual threat to life. Exhibits intrusive memories, nightmares, flashbacks, avoidance of trauma-related stimuli, negative alterations in mood and cognition, hypervigilance, exaggerated startle response, and sleep disturbances for over 1 month.',
    challenged_diagnosis: null,
    challenged_justification: null
  }
];

async function seedDatabase(shouldClosePool = true) {
  try {
    console.log('Initializing database...');
    await initializeDb();
    
    console.log('Clearing existing data...');
    await pool.query('DELETE FROM diagnoses');
    
    console.log('Seeding diagnoses...');
    for (const diagnosis of mockedDiagnoses) {
      await pool.query(
        `INSERT INTO diagnoses (client_id, diagnosis_name, justification, challenged_diagnosis, challenged_justification, predicted_date)
         VALUES ($1, $2, $3, $4, $5, now() - interval '${Math.floor(Math.random() * 30)} days')`,
        [
          diagnosis.client_id,
          diagnosis.diagnosis_name, 
          diagnosis.justification,
          diagnosis.challenged_diagnosis,
          diagnosis.challenged_justification
        ]
      );
    }
    
    console.log(`Seeded ${mockedDiagnoses.length} diagnoses successfully`);
    
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM diagnoses');
    console.log(`Total diagnoses in database: ${rows[0].count}`);
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    if (shouldClosePool) {
      await pool.end();
      process.exit(0);
    }
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { mockedDiagnoses, seedDatabase };