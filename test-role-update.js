// Simple test to update user role
async function updateUserRole() {
  try {
    const response = await fetch('http://localhost:3000/api/users/2/update-role', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 2,
        role: 'collector'
      })
    });

    const result = await response.json();
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

updateUserRole();