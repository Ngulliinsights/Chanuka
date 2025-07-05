const fetchComments = async () => {
    try {
      const response = await fetch(`/api/community/comments/${billId}?sort=${sortBy}&expert=${filterExpert}&section=${billSection || ''}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

const fetchComments = async () => {
    try {
      const response = await fetch(`/api/community/comments/${billId}?sort=${sortBy}&expert=${filterExpert}&section=${billSection || ''}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

const response = await fetch(`/api/community/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          expertise: newExpertise,
          billId: billId.toString(),
          section: billSection,
        }),
      });