require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.get('/scrape/:keyword', async (req, res) => {
    const jobSearchTerm = req.query.keyword;
    const location =  'Beirut, Beirut Governorate, Lebanon';

    (async () => {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        console.log('Navigating to LinkedIn login page...');
        const linkedinLoginUrl = 'https://www.linkedin.com/login';
        await page.goto(linkedinLoginUrl, { waitUntil: 'networkidle2', timeout: 120000 });

        console.log('Entering login credentials...');
        await page.type('#username', process.env.LINKEDIN_EMAIL, { delay: 50 });
        await page.type('#password', process.env.LINKEDIN_PASSWORD, { delay: 50 });

        console.log('Submitting login form...');
        await page.click('.btn__primary--large');

        console.log('Waiting for feed page to load...');
        await page.waitForSelector('nav', { timeout: 120000 });
        console.log('Login successful!');

        console.log('Navigating to job search page...');
        const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(jobSearchTerm)}&location=${encodeURIComponent(location)}&geoId=&trk=public_jobs_jobs-search-bar_search-submit&position=1&pageNum=0`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
        console.log('Job search page loaded!');

        console.log('Waiting for job cards to load...');
        await page.waitForSelector('.job-card-container', { timeout: 120000 });
        console.log('Job cards loaded!');

        console.log('Extracting job details...');
        const jobs = await page.evaluate(() => {
            const jobNodes = document.querySelectorAll('.job-card-container');
            const jobList = [];

            jobNodes.forEach((job) => {
                const jobTitle = job.querySelector('.job-card-list__title')?.innerText || 'N/A';
                const companyName = job.querySelector('.job-card-container__company-name')?.innerText || 'N/A';
                const jobLocation = job.querySelector('.job-card-container__metadata-item')?.innerText || 'N/A';
                const jobDescription = job.querySelector('.job-card-container__snippet')?.innerText || 'N/A';
                const jobPostDate = job.querySelector('time')?.getAttribute('datetime') || 'N/A';
                const applicationLink = job.querySelector('a')?.href || 'N/A';

                jobList.push({
                    jobTitle,
                    companyName,
                    jobLocation,
                    jobDescription,
                    jobPostDate,
                    applicationLink
                });
            });

            return jobList;
        });

        console.log('Saving extracted data to JSON file...');
        fs.writeFileSync('jobs.json', JSON.stringify(jobs, null, 2));
        console.log('Job data extracted and saved to jobs.json');

        await browser.close();

        res.json(jobs);
    })();
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
