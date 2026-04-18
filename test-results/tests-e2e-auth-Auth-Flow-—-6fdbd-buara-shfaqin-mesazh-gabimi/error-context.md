# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e7]: LW
      - heading "Login to LokalWeb" [level=3] [ref=e8]
      - paragraph [ref=e9]: Enter your email and password to access your dashboard
    - generic [ref=e10]:
      - generic [ref=e11]:
        - alert [ref=e12]:
          - img [ref=e13]
          - generic [ref=e15]: Incorrect email or password
        - generic [ref=e16]:
          - text: Email
          - textbox "Email" [ref=e17]:
            - /placeholder: email@example.com
            - text: fake@test.com
        - generic [ref=e18]:
          - generic [ref=e19]:
            - generic [ref=e20]: Password
            - button "Forgot password?" [ref=e21] [cursor=pointer]
          - textbox "Password" [ref=e22]: wrongpassword123
        - generic [ref=e23]:
          - checkbox "Remember me" [ref=e24] [cursor=pointer]
          - checkbox
          - generic [ref=e25]: Remember me
      - generic [ref=e26]:
        - button "Sign In" [ref=e27] [cursor=pointer]
        - paragraph [ref=e28]:
          - text: Don't have an account?
          - button "Register" [ref=e29] [cursor=pointer]
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e35] [cursor=pointer]:
    - img [ref=e36]
  - alert [ref=e39]
```