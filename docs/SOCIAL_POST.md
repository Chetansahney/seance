# Social Blitz post

Rules: post during the submission period (before Dec 4, 2:00 PM PT) on any platform. The post must **start with**
`#KiroweenHackathon26` and share your favorite thing about Kiro and how it changed your approach. Put the post's URL
in your Devpost submission.

Everything below happened in the Kiro sessions for Séance. The opinions ("my favorite thing…") are a suggestion,
so change them if they aren't yours. Copy the text between the lines.

---

## LinkedIn / longer version

#KiroweenHackathon26 👻 I built Séance: it finds the dead links in anything you've written and brings them back from the Internet Archive.

I tested it on an old README: 6 of its 10 links were dead. Séance found them, put each in a graveyard, and raised 4 of them from the last snapshot where the page was still healthy (never the archived 404 page).

My favorite thing about Kiro: agent hooks. I wrote one rule in plain English: "when a file in src/ changes, run the tests and fix the code, not the test". While Kiro implemented the robots.txt task, that hook fired on its own, a test failed, and Kiro found the cause: when a server answered "429, too busy", the code still sent a second request. It fixed the code in the same session. Nobody had to remember to run the tests.

How it changed my approach: I write the rules down once (a spec with acceptance criteria, steering docs, hooks) instead of repeating them in every prompt. When Kiro reached for an extra npm package, the steering doc's "zero runtime dependencies" rule was the reason to say no, and Kiro rewrote the GitHub Action without it.

🔗 Live: https://seance-sqcf.onrender.com
🎥 Demo: https://youtu.be/3w3kBzwGrLQ
💻 Code (MIT): https://github.com/Chetansahney/seance

#Kiro #LinkRot #InternetArchive #BuildInPublic

---

## X / short version (under 280 characters)

#KiroweenHackathon26 Built Séance 👻 It finds dead links in your docs and raises them from the Wayback Machine. Favorite Kiro feature: hooks. One fired on its own, ran the tests and caught a bug before it shipped. https://seance-sqcf.onrender.com

---

(The short version is about 237 characters as X counts them, with the link counted as 23.)
