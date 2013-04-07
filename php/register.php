<?php 
// 接続
$link = mysql_connect('localhost', 'root', 'root');
if(!$link) die("error connect".mysql_error());

// DB選択
$db_selected = mysql_select_db("user_db", $link);
if(!$db_selected) die("error select".mysql_error);

$name = $_POST["name"];
$location = $_POST["location"];
$sql = sprintf("insert into user(name, location) values ('%s', '%s');",
		mysql_real_escape_string($name), mysql_real_escape_string($location));

mysql_set_charset("utf8");
$result = mysql_query($sql);
if(!$result) die("error sql".mysql_error());

mysql_close($link);

return $sql;

?>