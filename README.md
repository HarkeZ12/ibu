# IBU Quizzes

Revision quizzes for courses at International Burch University (2026/2027).

**Open the quizzes:** https://harkez12.github.io/ibu/

Courses:

- FENMS 0121 - Data Structures and Algorithms
- IT 2001 - Web Programming
- IT 2002 - System Analysis and Design
- IT 2003 - Ethical and Legal Issues of IT
- IT 2004 - Parallel Programming

Each quiz is a single HTML file in its course folder, grouped by week, with `quiz/`, `practice-questions/` and `reading-material/` folders inside each week (for example `week04/quiz/`). A new quiz also needs an entry in the `SUBJECTS` list in `index.html`.

**Downloads:** on every push, a GitHub Action packs each week folder and each whole course into a ZIP and publishes it in the [Downloads release](https://github.com/HarkeZ12/ibu/releases/tag/downloads). The links never change, for example `https://github.com/HarkeZ12/ibu/releases/download/downloads/FENMS-0121-week04.zip` or `.../IT-2001-all.zip`. The site shows a download button for every week by itself. Assignments go inside the week folder (for example `week05/assignment/`) and are included in that week's ZIP.

Practice 04: all eight Week 04 practice questions on one page, laid out like the LMS quiz. Press Check to grade an answer: the trace questions are checked in the browser, and the C++ questions are compiled and run against test cases on Compiler Explorer (godbolt.org), so they need an internet connection.

Reading 04: 82 questions, learn mode and exam mode, an explanation for every option, and retrying wrong answers, the whole quiz or weak topics. An unfinished attempt and topic statistics are saved in the browser's localStorage and do not move between devices. If the browser blocks storage, the quiz still works without saving. A topic counts as weak below 80% correct across finished attempts.
