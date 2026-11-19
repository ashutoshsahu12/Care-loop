const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const root = process.env.CARELOOP_BROWSER_URL || 'http://127.0.0.1:5173';
const hosted = process.env.CARELOOP_BROWSER_DEMO === 'true';
const nextDate = new Date(Date.now()+86400000*2).toISOString().slice(0,10);
const demoName = 'Intake · Browser Test';
const seeded = 'Kavita Sundaram';
let stage = 'start';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CARELOOP_CHROMIUM });
  const faults = [];
  const writes = [];
  const screens = [];
  const step = (label) => { stage = label; process.stdout.write(label+'\n'); };
  const createPage = async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(9000);
    page.on('pageerror', error => faults.push(error.message));
    page.on('response', response => {
      if (hosted ? !response.url().startsWith(root+'/') : !response.url().includes(':8787/')) return;
      const method = response.request().method();
      if (method === 'POST' || method === 'PATCH') writes.push(`${method} ${response.status()} ${response.url()}`);
      if (hosted && new URL(response.url()).pathname.startsWith('/api/')) faults.push('Unexpected external API request: '+response.url());
      if (response.status() >= 400) faults.push(`${response.status()} ${response.url()}`);
    });
    screens.push(page);
    return page;
  };
  const sharedPage = hosted ? await createPage() : undefined;
  const login = async (role, label) => {
    const page = sharedPage ?? await createPage();
    if (hosted) {
      await page.goto(root+'/login?role='+role);
      await page.getByRole('button',{name:new RegExp('^Open as '+label.source, 'i')}).click();
    } else {
      await page.goto(root+'/login');
      await page.getByRole('button',{name:label}).click();
      await page.getByLabel('Password').fill('test-demo');
      await page.getByRole('button',{name:'Sign in to CARELOOP'}).click();
    }
    await page.waitForURL('**/dashboard/'+role);
    return page;
  };
  const go = (page,path) => page.goto(root+path);
  const btn = (page, name) => page.getByRole('button',{name,exact:true});
  const lbl = (page, name) => page.getByLabel(name,{exact:true});
  const choose = async (page, name, text) => {
    const select = lbl(page,name);
    const option = select.locator('option').filter({hasText:text}).first();
    await option.waitFor({state:'attached'});
    await select.selectOption(await option.getAttribute('value') ?? await option.textContent());
  };
  const has = (page,text) => page.getByText(text,{exact:false}).first().waitFor();
  try {
    if (sharedPage) {
      step('Judge walkthrough opens directly and calculates metrics from the seed');
      await go(sharedPage, '/judge-demo');
      await sharedPage.getByRole('heading', { name: 'Closing the screening-to-care loop' }).waitFor();
      await has(sharedPage, '2 of 12');
      await sharedPage.getByRole('link', { name: 'Open as care coordinator' }).click();
      await sharedPage.getByRole('button', { name: 'Open as Care coordinator' }).waitFor();
    }
    step('Care worker signs in and registers a patient');
    const worker = await login('worker',/Care coordinator/);
    await go(worker,'/patients');
    await btn(worker,'Add patient').click();
    await lbl(worker,'Full name').fill(demoName);
    await lbl(worker,'Gender').selectOption('Female');
    await lbl(worker,'Phone number').fill('5550123456');
    await lbl(worker,'Email address').fill('browser-intake@example.test');
    const registrationResponse = hosted ? null : worker.waitForResponse(response => response.url().endsWith('/api/patients') && response.request().method() === 'POST');
    await btn(worker,'Create patient').click();
    let patientReference = registrationResponse ? (await (await registrationResponse).json()).patientReference : undefined;
    await has(worker,'Patient profile created successfully.');
    assert.equal(await worker.getByText(demoName,{exact:true}).count(),0);
    const screen = async (name, result) => {
      await go(worker,'/screenings');
      await btn(worker,'Add screening').click();
      await choose(worker,'Patient',name);
      await lbl(worker,'Screening type').selectOption('Cardiovascular / blood pressure');
      await lbl(worker,'Result summary').fill(result);
      await btn(worker,'Save record').click();
      await has(worker,'Screening record saved');
    };
    step('New registration appears for first screening and becomes assigned');
    await screen(demoName,'BP 150/95 · browser intake');
    await go(worker,'/patients');
    await has(worker,demoName);
    if (hosted) {
      const href = await worker.getByRole('link', { name: 'View '+demoName }).getAttribute('href');
      patientReference = href.split('/').at(-1);
    }
    assert.match(patientReference, /^CL-P-/);
    step('Create a fresh case for the seeded patient to test all four roles');
    await screen(seeded,'BP 152/95 · browser workflow');
    await go(worker,'/referrals');
    await btn(worker,'Create referral').click();
    await choose(worker,'Patient',seeded);
    await lbl(worker,'Specialty').selectOption('Gastroenterology');
    await lbl(worker,'Referred to').fill('Browser Test Clinic');
    await lbl(worker,'Receiving clinician').selectOption('usr-clin-1');
    await btn(worker,'Create referral').last().click();
    await has(worker,'Referral created and is awaiting specialist acceptance.');
    step('Doctor sees and accepts the assigned referral');
    const doctor = await login('doctor',/Doctor/);
    await go(doctor,'/referrals');
    const referral = (page) => page.getByRole('row').filter({hasText:'Browser Test Clinic'});
    await referral(doctor).getByRole('button',{name:/Update referral/}).click();
    await lbl(doctor,'Referral progress').selectOption('Accepted');
    await doctor.getByRole('dialog', { name: 'Update referral' }).getByRole('button', { name: 'Update referral' }).click();
    await referral(doctor).getByText('Accepted',{exact:true}).waitFor();
    step('Care worker schedules a referral-linked visit and records attendance');
    if (hosted) await login('worker',/Care coordinator/);
    await go(worker,'/appointments');
    await btn(worker,'Schedule appointment').click();
    await choose(worker,'Patient',seeded);
    await choose(worker,'Linked referral','Browser Test Clinic');
    await lbl(worker,'Preferred date').fill(nextDate);
    await btn(worker,'Schedule visit').click();
    await has(worker,'Appointment scheduled.');
    if (hosted) await login('doctor',/Doctor/);
    await go(doctor,'/referrals');
    await referral(doctor).getByText('Scheduled',{exact:true}).waitFor();
    if (hosted) {
      await login('worker',/Care coordinator/);
      await go(worker,'/appointments');
    }
    const visit = worker.locator('.appointment-list-item').filter({hasText:seeded});
    await visit.getByRole('button',{name:'Record attendance'}).click();
    await lbl(worker,'Notes').fill('Attended synthetic test consultation.');
    await btn(worker,'Save outcome').click();
    await has(worker,'Appointment outcome recorded.');
    step('Care worker creates and completes a follow-up');
    await go(worker,'/followups');
    await btn(worker,'Create follow-up').click();
    await choose(worker,'Patient',seeded);
    await lbl(worker,'Follow-up action').fill('Browser follow-up verification');
    await lbl(worker,'Due date').fill(nextDate);
    await btn(worker,'Add follow-up').click();
    const follow = worker.locator('.followup-item').filter({hasText:'Browser follow-up verification'});
    await follow.getByRole('button',{name:'Mark complete'}).click();
    await follow.getByRole('button',{name:'Done'}).waitFor();
    step('Doctor verifies and closes the case');
    if (hosted) await login('doctor',/Doctor/);
    await go(doctor,'/patient/CL-P-1001');
    const verify = doctor.locator('.close-case-card').getByRole('button');
    await verify.click();
    await lbl(doctor,'Closure confirmation note').fill('Synthetic visit and follow-up verified in the browser.');
    await doctor.getByRole('checkbox').check();
    await btn(doctor,'Confirm closure').click();
    await has(doctor,'Case closure verified and recorded');
    step('Patient sees closure and acknowledges the newly generated notification');
    const patient = await login('patient',/Patient/);
    await go(patient,'/my-case');
    await patient.getByText('Closed',{exact:true}).first().waitFor();
    await has(patient,'Browser Test Clinic');
    await go(patient,'/notifications');
    const oldUpdate = patient.locator('.notification-item').filter({hasText:'Your cardiovascular screening summary is ready for review.'});
    const newUpdate = patient.locator('.notification-item').filter({hasText:'Your Cardiovascular / blood pressure screening has been processed'});
    await oldUpdate.getByRole('button',{name:'Acknowledge',exact:true}).click();
    await oldUpdate.getByRole('button',{name:'Acknowledged',exact:true}).waitFor();
    await newUpdate.getByRole('button',{name:'Acknowledge',exact:true}).click();
    await newUpdate.getByRole('button',{name:'Acknowledged',exact:true}).waitFor();
    await oldUpdate.getByRole('link', { name: 'View case details' }).click();
    await patient.waitForURL('**/my-case/CL-1001');
    await patient.locator('.detail-id').getByText('CL-1001', { exact: true }).waitFor();
    step('Administrator sees the new case and connected admin screens');
    const admin = await login('admin',/Administrator/);
    await go(admin,'/care-cases');
    const intakeCase = admin.getByRole('row').filter({ hasText: patientReference });
    await intakeCase.getByText('screening', { exact: true }).waitFor();
    const closedCase = admin.getByRole('row').filter({ hasText: 'CL-P-1001' }).filter({ hasText: 'Verified case closure completed' });
    await closedCase.getByText('completed', { exact: true }).waitFor();
    for (const path of ['/care-monitoring','/care-escalations','/care-at-risk','/care-outcomes']) {
      await go(admin,path);
      await admin.locator('main h1').first().waitFor();
      await admin.waitForFunction(() => !document.querySelector('main')?.innerText.includes('Loading'));
      if (path === '/care-escalations') await has(admin, 'CL-P-1006');
    }
    if (sharedPage) {
      step('Judge metrics reflect the completed workflow and reset restores the seed');
      await go(sharedPage, '/judge-demo');
      await has(sharedPage, '3 of 14');
      const independent = await createPage();
      await go(independent, '/judge-demo');
      await has(independent, '2 of 12');
      sharedPage.once('dialog', dialog => void dialog.accept());
      await btn(sharedPage, 'Reset synthetic cases').click();
      await has(sharedPage, '2 of 12');
    }
    assert.deepEqual(faults,[]);
    console.log('Four-role browser walkthrough passed');
  } catch (error) {
    console.error(stage, error.message, { faults, writes });
    for (const page of screens) console.error(page.url(), (await page.locator('body').innerText().catch(()=>'')).slice(-1800));
    process.exitCode=1;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
