import os
import hashlib

def hash_password(password, salt=None):
    if salt is None:
        salt = os.urandom(16).hex()
    
    hash_obj = hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode('utf-8'), 
        salt.encode('utf-8'), 
        100000
    )
    
    return salt, hash_obj.hex()

def verify_password(password, stored_salt, stored_hash):
    _, new_hash = hash_password(password, stored_salt)
    return new_hash == stored_hash