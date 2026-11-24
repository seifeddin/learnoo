-- Runs once when the local Compose volume is first created.
-- Separate database for the test suite; tests create and drop their own schemas in it.
CREATE DATABASE learnoo_test OWNER learnoo;
