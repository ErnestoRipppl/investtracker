#!/usr/bin/env python
import getpass
import bcrypt


def main():
    print("InvestTracker Password Hash Generator")
    print("-------------------------------------")
    password = getpass.getpass("Enter password to hash: ")
    confirm = getpass.getpass("Confirm password: ")
    
    if password != confirm:
        print("Passwords do not match!")
        return
        
    # Generate bcrypt hash
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    print("\nUse the following hash for your AUTH_PASSWORD_HASH environment variable:")
    print(hashed.decode("utf-8"))


if __name__ == "__main__":
    main()
