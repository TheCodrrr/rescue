# Department Caching and Selection Implementation

## Overview
Implemented a smart department caching system in the Signup page that fetches and caches departments efficiently, displaying them conditionally based on user role and category selection.

## Features Implemented

### 1. **Asynchronous Department Fetching on Page Load**
- All departments are fetched from `/departments` endpoint when the Signup component mounts
- Data is cached in `allDepartments` state to avoid redundant API calls
- Uses `useRef` (`hasFetchedDepartments`) to ensure departments are only fetched once

### 2. **Category-Based Prefetching**
- When user selects "Officer" role, departments are automatically prefetched by category
- Fetches from 6 category endpoints in parallel: `/departments/category/{category}`
  - `rail`, `road`, `fire`, `cyber`, `police`, `court`
- Cached in `departmentsByCategory` object for instant access
- Uses `useRef` (`hasPrefetchedCategories`) to prevent duplicate prefetching

### 3. **Smart Conditional Display**
- Department dropdown only appears when:
  - User selects "Officer" role AND
  - User selects a category
- Displays departments filtered by selected category from cache
- Shows department count and loading states

## Implementation Details

### Frontend (Signup.jsx)

#### State Management
```javascript
// Department caching state
const [allDepartments, setAllDepartments] = useState([]);
const [departmentsByCategory, setDepartmentsByCategory] = useState({
    rail: [], road: [], fire: [], cyber: [], police: [], court: []
});
const [isDepartmentsLoading, setIsDepartmentsLoading] = useState(false);
const [categoryDepartmentsLoading, setCategoryDepartmentsLoading] = useState(false);
const hasFetchedDepartments = useRef(false);
const hasPrefetchedCategories = useRef(false);
```

#### Form Data
```javascript
const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "citizen",
    category: "",
    department_id: "",  // Added
    profileImage: null
});
```

#### Fetching Logic

**Initial Fetch (All Departments)**
```javascript
useEffect(() => {
    const fetchAllDepartments = async () => {
        if (hasFetchedDepartments.current) return;
        
        const response = await axiosInstance.get('/departments');
        setAllDepartments(response.data.data);
        hasFetchedDepartments.current = true;
    };
    fetchAllDepartments();
}, []);
```

**Prefetch by Category (When Officer Selected)**
```javascript
useEffect(() => {
    const prefetchDepartmentsByCategory = async () => {
        if (formData.role !== 'officer' || hasPrefetchedCategories.current) return;

        const categories = ['rail', 'road', 'fire', 'cyber', 'police', 'court'];
        const promises = categories.map(category =>
            axiosInstance.get(`/departments/category/${category}`)
        );
        const results = await Promise.all(promises);
        
        // Cache results by category
        setDepartmentsByCategory(categorizedDepts);
        hasPrefetchedCategories.current = true;
    };
    prefetchDepartmentsByCategory();
}, [formData.role]);
```

#### UI Component
```jsx
{/* Department Selection - Only shown for officers who have selected a category */}
{formData.role === 'officer' && formData.category && (
    <div className="animate-fadeIn">
        <label>Select Your Department *</label>
        <select
            name="department_id"
            value={formData.department_id}
            onChange={handleInputChange}
            disabled={categoryDepartmentsLoading}
        >
            <option value="">
                {categoryDepartmentsLoading ? 'Loading...' : 'Select a department'}
            </option>
            {departmentsByCategory[formData.category]?.map((dept) => (
                <option key={dept._id} value={dept._id}>
                    {dept.name} - Level {dept.jurisdiction_level}
                </option>
            ))}
        </select>
    </div>
)}
```

#### Validation
```javascript
// Department validation for officers
if (formData.role === 'officer' && !formData.department_id) {
    toast.error('Please select a department');
    return;
}
```

#### Form Submission
```javascript
if (formData.role === 'officer' && formData.department_id) {
    formDataToSend.append('department_id', formData.department_id);
}
```

### Backend Updates

#### user.controllers.js

**Extract department_id from request**
```javascript
const { category, department_id } = role === "officer" 
    ? req.body 
    : { category: "", department_id: "" };
```

**Validation**
```javascript
if (role === "officer") {
    if (!category || category.trim() === "") {
        throw new ApiError(400, "Category is required for officer role")
    }
    if (!department_id || department_id.trim() === "") {
        throw new ApiError(400, "Department is required for officer role")
    }
}
```

**User Creation**
```javascript
const user = await User.create({
    name,
    profileImage: imageUrl,
    email,
    password,
    phone,
    role,
    user_level: level,
    officer_category: category || "",
    department_id: department_id || null,  // Added
})
```

#### user.models.js (Already exists)
```javascript
department_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'department',
}
```

## API Endpoints Used

1. **GET /departments** - Fetch all departments (called on mount)
2. **GET /departments/category/:category** - Fetch departments by category (prefetched when officer selected)

## User Flow

### For Regular Users (Citizen/Admin)
1. User loads Signup page
2. All departments fetched in background (cached but not displayed)
3. User fills form → submits → no department field required

### For Officers
1. User loads Signup page
2. All departments fetched in background
3. User selects "Officer" role
   - Triggers prefetch of all category-specific departments (6 parallel requests)
4. User selects category (e.g., "Rail")
   - Department dropdown appears instantly with cached rail departments
5. User selects specific department from dropdown
6. Form validates: role + category + department required
7. Submit → department_id sent to backend

## Performance Optimizations

### 1. **Caching Strategy**
- ✅ Single fetch on mount (all departments)
- ✅ Prefetch only when needed (officer role selected)
- ✅ No re-fetching on subsequent role/category changes
- ✅ Parallel requests for category-specific data

### 2. **Loading States**
- `isDepartmentsLoading` - Initial fetch of all departments
- `categoryDepartmentsLoading` - Prefetching departments by category
- Disables dropdown during loading to prevent premature selection

### 3. **Memory Efficiency**
- Uses `useRef` to track fetch status (no re-renders)
- Prevents duplicate API calls
- Clears department_id when role/category changes

### 4. **Network Efficiency**
```
Citizen signup:    1 API call  (all departments - background)
Officer signup:    7 API calls (1 all + 6 category prefetch)
Multiple signups:  Same cached data (no additional calls)
```

## Edge Cases Handled

1. **No departments available**: Shows message in dropdown
2. **Loading state**: Disables dropdown and shows loading text
3. **Role change**: Resets category and department_id
4. **Category change**: Resets department_id
5. **Network errors**: Graceful fallback, empty arrays
6. **Validation**: Prevents submission without all required fields

## UI/UX Features

- 🎨 Glassmorphism design matching signup aesthetic
- 🔄 Smooth animations with `animate-fadeIn`
- 🏢 Building2 icon for department field
- 📊 Department count display
- ⚡ Instant dropdown population from cache
- 🔒 Form validation with helpful toast messages
- 🎯 Level display in department options

## Testing Checklist

- [ ] Page loads → all departments fetched in background
- [ ] Select Officer role → category prefetch triggered
- [ ] Select category → department dropdown appears instantly
- [ ] Department options show correct category departments
- [ ] Department count displays correctly
- [ ] Form validation prevents submission without department
- [ ] Switching roles resets department selection
- [ ] Switching categories resets department selection
- [ ] Loading states display correctly
- [ ] Backend receives correct department_id
- [ ] User created with correct department association

## Related Files
- `frontend/src/auth/Signup.jsx` - Main implementation
- `backend/src/controllers/user.controllers.js` - Registration logic
- `backend/src/models/user.models.js` - User schema
- `backend/src/controllers/department.controllers.js` - Department endpoints
- `backend/src/routes/department.routes.js` - Department routes
