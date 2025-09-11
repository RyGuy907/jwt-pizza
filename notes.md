# Learning notes

## JWT Pizza code study and debugging

As part of `Deliverable ⓵ Development deployment: JWT Pizza`, start up the application and debug through the code until you understand how it works. During the learning process fill out the following required pieces of information in order to demonstrate that you have successfully completed the deliverable.

| User activity                                       | Frontend component | Backend endpoints | Database SQL |
| --------------------------------------------------- | ------------------ | ----------------- | ------------ |
| View home page                                      |     home.tsx         |       none        |    none      |
| Register new user<br/>(t@jwt.com, pw: test)         |  register.jsx        |[POST] /api/auth  | `INSERT INTO user (name, email, password) VALUES (?, ?, ?)`<br/>`INSERT INTO userRole (userId, role, objectId) VALUES (?, ?, ?)` |
| Login new user<br/>(t@jwt.com, pw: test)            |     login.tsx        | [PUT] /api/auth   | `INSERT INTO auth (token, userId) VALUES (?, ?) ON DUPLICATE KEY UPDATE token=token`<br/>`SELECT * FROM user WHERE email=?`<br/>`SELECT * FROM userRole WHERE userId=?` |
| Order pizza                                         |   payment.jsx        | [POST] /api/order | `SELECT userId FROM auth WHERE token=?`<br/>`INSERT INTO dinerOrder (dinerId, franchiseId, storeId, date) VALUES (?, ?, ?, now())`<br/>`INSERT INTO orderItem (orderId, menuId, description, price) VALUES (?, ?, ?, ?)` |
| Verify pizza                                        | delivery.tsx	    | [POST] /api/order/verify |none         |
| View profile page                                   |dinerDashboard.tsx    | [GET] /api/order  | `SELECT userId FROM auth WHERE token=?` |
| View franchise<br/>(as diner)                       |franchiseDashboard.tsx|[GET] /api/franchise/:userId| `SELECT id, name FROM store WHERE franchiseId=?` |
| Logout                                              |    logout.tsx       | [DELETE] /api/auth | `SELECT userId FROM auth WHERE token=?`</br>`DELETE FROM auth WHERE token=?` |
| View About page                                     |     about.tsx      |       none        |       none        |
| View History page                                   |    history.tsx     |       none        |       none        |
| Login as franchisee<br/>(f@jwt.com, pw: franchisee) |     login.tsx      | [PUT] /api/auth   | `INSERT INTO auth (token, userId) VALUES (?, ?) ON DUPLICATE KEY UPDATE token=token`<br/>`SELECT * FROM user WHERE email=?`<br/>`SELECT * FROM userRole WHERE userId=?` |
| View franchise<br/>(as franchisee)                  |franchiseDashboard.tsx| [GET] /api/franchise/:userId | `SELECT objectId FROM userRole WHERE role='franchisee' AND userId=?` |
| Create a store                                      |                    |                   |              |
| Close a store                                       |                    |                   |              |
| Login as admin<br/>(a@jwt.com, pw: admin)           |                    |                   |              |
| View Admin page                                     |                    |                   |              |
| Create a franchise for t@jwt.com                    |                    |                   |              |
| Close the franchise for t@jwt.com                   |                    |                   |              |
