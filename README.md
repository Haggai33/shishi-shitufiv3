# Shishi-Shitufi: Community Potluck Management App

![Shishi-Shitufi Banner](https://via.placeholder.com/1200x300.png?text=Shishi-Shitufi+App)

**Shishi-Shitufi** (Hebrew for "Collaborative Friday") is a real-time, user-centric web application designed to streamline the organization of community potluck events. Built with a focus on a seamless user experience, the app allows members of a community to easily see what's needed for an event, sign up to bring items, and add their own contributions, all in a live, collaborative environment.

**Live Demo:** [Link to your deployed application]

---

## ✨ Key Features

This application was architected with a "user-first" philosophy, ensuring that both regular users and administrators have an intuitive and efficient experience.

### For Community Members (The User Experience):

*   **Effortless Onboarding:** Users can join and participate instantly with a seamless anonymous authentication flow. No complex sign-up process is required.
*   **First-Time User Guidance:** The app intelligently detects when a new user participates and prompts them for their name, which is then saved locally for future sessions.
*   **"Bring & Assign" in One Click:** A standout UX feature allows users to add a new item to the potluck list and simultaneously assign it to themselves with a single button click, removing friction and encouraging participation.
*   **Real-Time Event View:** Leveraging Firebase Realtime Database, the interface updates instantly for all users as items are added or assigned, creating a dynamic and collaborative feel.
*   **Clear & Intuitive UI:** A clean, filterable, and searchable list of items ensures users can quickly find what they want to bring, see what's already taken, and view their own commitments.

### For Administrators:

*   **Centralized Admin Panel:** A dedicated, role-protected section for complete control over events, users, and menu items.
*   **Flexible Item Import:** Admins can bulk-import menu items from multiple sources, including **Excel (.xlsx), CSV, plain text, and preset lists**, saving significant setup time.
*   **Secure Role-Based Access:** Admin capabilities are protected by server-side Firebase Security Rules, ensuring that only authorized users can perform management actions.
*   **Comprehensive Management:** Full CRUD (Create, Read, Update, Delete) functionality for events, menu items, and user assignments.

---

## 🛠️ Tech Stack

This project is built with a modern, robust, and scalable tech stack.

| Technology | Description |
| :--- | :--- |
| **React** | A declarative, component-based library for building user interfaces. |
| **Vite** | A next-generation frontend tooling for an incredibly fast development experience. |
| **TypeScript** | Strong typing for enhanced code quality, maintainability, and developer experience. |
| **Tailwind CSS** | A utility-first CSS framework for rapid UI development. |
| **Zustand** | A small, fast, and scalable state-management solution. |
| **Firebase** | The backend-as-a-service (BaaS) platform providing: |
| | - **Realtime Database:** For live data synchronization. |
| | - **Authentication:** For secure user management (anonymous & email/password). |
| | - **Security Rules:** For server-side data protection and authorization. |

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   Node.js (v18 or later)
*   npm
*   A Firebase project

### Installation

1.  **Clone the repo:**
    ```sh
    git clone https://github.com/Haggai33/Shishi-Shitufi.git
    cd Shishi-Shitufi
    ```

2.  **Install NPM packages:**
    ```sh
    npm install
    ```

3.  **Set up Firebase:**
    *   Create a new project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
    *   Create a new "Realtime Database".
    *   Enable "Anonymous" and "Email/Password" sign-in methods in the Authentication section.
    *   Create a new web app in your Firebase project settings.
    *   Copy your Firebase configuration object into `src/lib/firebase.ts`.

4.  **Configure Security Rules:**
    *   In the Firebase console, navigate to "Realtime Database" -> "Rules".
    *   Copy the contents of `firebase-rules.json` from this project and paste them into the rules editor.
    *   Publish the rules.

5.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

---

## 📸 Screenshots

*(This is a great place to add screenshots of your application. For example: the main event view, the admin panel, and the item import modal.)*

| Main Event View | Admin Panel |
| :---: | :---: |
| ![Main View](https://via.placeholder.com/400x300.png?text=Main+Event+View) | ![Admin Panel](https://via.placeholder.com/400x300.png?text=Admin+Panel) |

---

## 👤 Author

**Chagai Yechiel**

*   **LinkedIn:** [https://www.linkedin.com/in/chagai-yechiel/](https://www.linkedin.com/in/chagai-yechiel/)
*   **GitHub:** [@Haggai33](https://github.com/Haggai33)
