import axios from 'axios';

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InNhZW5jcnlzdGFsLmdsb2JhbEBnbWFpbC5jb20iLCJzdWIiOiJlYWY4ZGI1NS1kZTM4LTRjMzktYTkzZS05OTlhOWExMDI2NmYiLCJpZCI6ImVhZjhkYjU1LWRlMzgtNGMzOS1hOTNlLTk5OWE5YTEwMjY2ZiIsInJvbGVzIjpbIkFkbWluIl0sInBlcm1pc3Npb25zIjpbInVzZXJzOmNyZWF0ZSIsInVzZXJzOnJlYWQiLCJ1c2Vyczp1cGRhdGUiLCJ1c2VyczpkZWxldGUiLCJ1c2Vyczphc3NpZ25fcm9sZXMiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIl0sInRlbmFudF9pZCI6IjI4YzVlOGFhLTUyNzAtNDI5OS1iMDYyLTI0MTQ1NzUwMTliOSIsImlhdCI6MTc3MTQ3MTUzMCwiZXhwIjoxNzcxNDc1MTMwfQ.s_1m4D3fzWgnJUl9x_ZK0gPV3tOaTEnwBsL5vjO26zg";

async function checkProjects() {
    try {
        console.log("🚀 Testing GET /api/v1/projects with token...");
        const response = await axios.get('http://localhost:3001/api/v1/projects', {
            headers: {
                Cookie: `access_token=${token}`
            }
        });

        console.log("✅ Response Status:", response.status);
        console.log("📦 Projects Found:", response.data.projects?.length || 0);
        console.log("📄 Full Response Data:", JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        console.error("❌ Request Failed:", error.response?.status, error.response?.data || error.message);
    }
}

checkProjects();
