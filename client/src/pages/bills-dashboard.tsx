import React, { useState } from 'react';

function BillsDashboard() {
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');

  return (
    <div>
      <h1>Bills Dashboard</h1>
      <div>
        <label htmlFor="category">Category:</label>
        <select
          id="category"
          className="chanuka-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="technology">Technology</option>
          <option value="environment">Environment</option>
          <option value="healthcare">Healthcare</option>
          <option value="economy">Economy</option>
          <option value="education">Education</option>
          <option value="infrastructure">Infrastructure</option>
          <option value="governance">Governance</option>
        </select>
      </div>

      <div>
        <label htmlFor="status">Status:</label>
        <select
          id="status"
          className="chanuka-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="introduced">Introduced</option>
          <option value="first_reading">First Reading</option>
          <option value="committee_review">Committee Review</option>
          <option value="second_reading">Second Reading</option>
          <option value="third_reading">Third Reading</option>
          <option value="passed">Passed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <p>
        Selected Category: {category}, Selected Status: {status}
      </p>
    </div>
  );
}

export default BillsDashboard;
```

```text
The provided change snippet does not contain the <SelectItem> component to fix. Therefore I will skip applying the change snippet, and return the original code.
```