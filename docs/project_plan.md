# Project Plan for "boekjehokje"

## Overview
The goal of this project is to create a web app called "boekjehokje" that simplifies the process of booking meeting rooms in the NYMA Makersplaats. The app will integrate with Google Calendar to provide a structured and user-friendly interface for managing room bookings while allowing users to continue using Google Calendar directly if they prefer.

## Key Adjustments Based on Feedback
1. **No Strict Rule Enforcement**:
   - The tool should guide users but not enforce rules strictly.
   - Users can still write to the underlying Google Calendar directly.

2. **No Email or In-App Notifications**:
   - Focus on simplicity and ease of use.

3. **No Admin Dashboard (Yet)**:
   - Keep the initial scope minimal and focused on the core booking functionality.

4. **Pure Frontend Approach**:
   - Store event data in Google Calendar.
   - Use localStorage for user-related data.

5. **Focus on Ease of Use**:
   - The tool should be easier to use than Google Calendar.
   - Guide users to do the right thing without strict enforcement.

## Proposed Solution
The "boekjehokje" web app will:
1. **Integrate with Google Calendar**:
   - Use OAuth for authentication.
   - Fetch and display events from the shared Google Calendar.

2. **Provide a Structured UI**:
   - Offer a clean and intuitive interface for booking rooms.
   - Use Dutch language for the UI.

3. **Guide Users**:
   - Suggest available time slots.
   - Provide visual cues for conflicts or double bookings.

4. **Optional Usage**:
   - Allow users to continue using Google Calendar directly if they prefer.

## Key Features
1. **User Authentication**:
   - Google OAuth for secure login.
   - Allow users to set or change their name and contact information.

2. **Room Management**:
   - List available rooms and their schedules.
   - Fetch room data from Google Calendar.

3. **Booking System**:
   - View available time slots for each room.
   - Book a room by selecting a time slot.
   - Visual cues for conflicts or double bookings.

4. **Local Storage**:
   - Store user preferences and settings in localStorage.

## Technical Stack
- **Frontend**: React.js with TypeScript for a responsive and dynamic UI.
- **Authentication**: Google OAuth for user login.
- **Google Calendar API**: For fetching and managing events.
- **Local Storage**: For storing user-related data.

## Testing Strategy
1. **Unit Testing**:
   - Test individual frontend components.
   - Use tools like Jest or React Testing Library.

2. **Integration Testing**:
   - Test interactions with the Google Calendar API.
   - Use tools like Cypress or Playwright.

3. **End-to-End Testing**:
   - Test user flows (e.g., booking a room).
   - Use tools like Cypress or Playwright.

4. **Automated Testing Pipeline**:
   - Set up continuous integration with GitHub Actions.
   - Run tests on every push to the main branch.

## Hosting and Deployment Strategy
1. **Frontend Hosting**:
   - Use a service like Vercel, Netlify, or GitHub Pages for fast and easy deployment.

2. **Continuous Deployment**:
   - Automate deployments from the main branch to the hosting service.
   - Use GitHub Actions for continuous deployment.

## Additional Questions for Discussion
1. **Rooms and Resources**:
   - What are the specific rooms or resources that need to be managed?
   - What are the names and capacities of these rooms?

2. **Design Guidelines**:
   - Are there any existing design guidelines or branding that the app should follow?

3. **Language Support**:
   - Should the app support multiple languages in the future, or is Dutch sufficient for now?

4. **User Roles and Permissions**:
   - Are there any specific user roles or permissions that need to be considered?

5. **Booking Workflow**:
   - What is the preferred workflow for booking a room (e.g., selecting a room first vs. selecting a time slot first)?

6. **Analytics and Reporting**:
   - Should the app include any analytics or reporting features (e.g., room usage statistics)?

7. **Accessibility Requirements**:
   - Are there any specific accessibility requirements for the app?

8. **Timeline**:
   - What is the preferred timeline for the initial release and subsequent updates?

## Tasks
1. **Setup and Authentication**:
   - Initialize the project with React.js and TypeScript.
   - Set up Google OAuth for user authentication.
   - Implement localStorage for storing user preferences.

2. **Integrate Google Calendar API**:
   - Fetch events from the shared Google Calendar.
   - Display events in the app’s UI.

3. **Design and Implement UI**:
   - Create a Dutch-language interface.
   - Implement a calendar view for booking rooms.
   - Add forms for booking and managing rooms.

4. **Add Booking Logic**:
   - Validate bookings to prevent conflicts.
   - Enforce booking rules (e.g., no overlapping events).

5. **Testing**:
   - Write unit tests for frontend components.
   - Write integration tests for Google Calendar API interactions.
   - Write end-to-end tests for user flows.

6. **Deployment**:
   - Deploy the frontend to Vercel, Netlify, or GitHub Pages.
   - Set up continuous deployment using GitHub Actions.

## Next Steps
1. Discuss the proposed plan and gather feedback.
2. Refine the plan based on the discussion.
3. Begin implementing the first phase (setup and authentication).