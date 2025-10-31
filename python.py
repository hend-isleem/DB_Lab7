import mysql.connector

conn = mysql.connector.connect(
    host="127.0.0.1",
    user="root",
    password="0000",
    database="lab7_db"
)

cursor = conn.cursor()
cursor.execute("SELECT * FROM users;")
for row in cursor.fetchall():
    print(row)

cursor.close()
conn.close()
