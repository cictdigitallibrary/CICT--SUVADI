<?php
	$query=urldecode(trim($_REQUEST['sfind']));

if(isset($_REQUEST['do'])){
	
	$start=isset($_REQUEST['start'])?$_REQUEST['start']:0;

    $book_id=isset($_POST['book_id'])?$_POST['book_id']:0;
	$category_id=isset($_POST['category_id'])?$_POST['category_id']:0;
	$sub_category_id=isset($_POST['sub_category_id'])?$_POST['sub_category_id']:0;
    $search = isset($_POST['sfind'])?$_POST['sfind']:'';

    $limit=isset($_REQUEST['limit'])?$_REQUEST['limit']:10;
	$ordfield=isset($_REQUEST['order'])?$_REQUEST['order']:0;
	$orderby=isset($_REQUEST['ordby'])?$_REQUEST['ordby']:'desc';
	$alter=isset($_REQUEST['alt'])?1:0;
	$search=$query;
	$_SESSION["desc"]=$search;


/*echo '<pre>';
echo '$book_id: '.$book_id;
echo '<br>';
echo 'Category ID: '.$category_id;
echo '<br>';
echo 'sub category id:'.$sub_category_id;
echo '<br>';

echo 'Song Number:'.$song_number;
exit;*/
    
    if($alter)
		$orderby=$_REQUEST['ordby']=='asc'?'desc':'asc';
	$sResult=$mFileHandler->search($search,$book_id,$category_id,$sub_category_id,$ordfield,$orderby,$start,$limit);

	if(!$sResult)
		$errmsg.="மன்னிக்கவும்;  தேடும் தகவல்கள் கிடைக்கப்பெறவில்லை (No Search Results Found).";
	else
		if(count($sResult)==1){
			$sMode=true;
			include WEB_PAGES_PATH."file_view.php";
	}else{
		$pagesFound=$search[0];
		$totalPages=ceil($pagesFound/$limit);
		$currentPage=($start+1);
		$pageFirst=0;
		$pageNext=($start+1)<$totalPages?($start+1):$start;
		$pagePrev=$start>0?$start-1:0;
		$pageLast=($totalPages-1);
		$currentCount=count($sResult);
		echo "<div id=\"sinfo\">
		தேடல் &quot;<strong>".$query."</strong>&quot; சம்பந்தமான '<strong>".$pagesFound."</strong>' முடிவுகளில் '<strong>{$currentCount}</strong>' காண்பிக்கப்பட்டுள்ளது.</div><br/>";
		$query=urlencode($query);

		$pageBar="<table width=\"100%\" border=\"0\" class=\"snav\" cellspacing=\"0\"><tr align=\"left\"><td colspan=\"2\" width=\"30%;\">";
		$pageBar.="<a href=\"".$_SERVER['PHP_SELF']."?do=search&sfind={$query}&iSearch=GO&order={$ordfield}&ordby={$orderby}&start={$pageFirst}&limit={$limit}\" class=\"bbutton\">&laquo;முதல் பக்கம்</a> ";
		$pageBar.=" <a href=\"".$_SERVER['PHP_SELF']."?do=search&sfind={$query}&iSearch=GO&order={$ordfield}&ordby={$orderby}&start={$pagePrev}&limit={$limit}\" class=\"bbutton\"> &lsaquo;முன் பக்கம்</a></td>";
		$pageBar.="<td align=\"center\"><strong>{$currentPage}-ஆம் பக்கம் (மொத்தம் {$totalPages})</strong></td><td colspan=\"2\" align=\"right\" width=\"30%\">";
		$pageBar.="<a href=\"".$_SERVER['PHP_SELF']."?do=search&sfind={$query}&iSearch=GO&order={$ordfield}&ordby={$orderby}&start={$pageNext}&limit={$limit}\" class=\"bbutton\">அடுத்த பக்கம்&rsaquo;</a> ";
		$pageBar.=" <a href=\"".$_SERVER['PHP_SELF']."?do=search&sfind={$query}&iSearch=GO&order={$ordfield}&ordby={$orderby}&start={$pageLast}&limit={$limit}\" class=\"bbutton\">கடைசி பக்கம்&raquo;</a></td></tr></table>";
		//id,member_id,amount,added_date,status,remarks
		echo $pageBar;
		echo "<table id=\"sview\" border=\"0\" width=\"100%\" cellpadding=\"5\" cellspacing=\"0\">\n";
		echo "<col width=\"30px\"/> <col width=\"35px\"/> <col width=\"150px\"/> <col width=\"160px\"/> <col width=\"\"/> <col width=\"\"/>";
		echo "<tr valign=\"top\">";
		//id,fname,filename,filetype,cid,upload_date,tags,description,
		echo "<th align=\"center\"><a href=\"".$_SERVER['PHP_SELF']."?do=search&sfind={$query}&filters={$filters}&iSearch=GO&order={$ordfield}&ordby={$orderby}&start={$start}&limit={$limit}\">வ. எண்</a></th>";
		echo "<th align=\"center\"><a href=\"".$_SERVER['PHP_SELF']."?do=search&sfind={$query}&filters={$filters}&iSearch=GO&order=0&ordby={$orderby}&start={$start}&limit={$limit}&alt=1\">பா. எண்</a></th>";
		echo "<th align=\"center\"><a href=\"".$_SERVER['PHP_SELF']."?do=search&sfind={$query}&filters={$filters}&iSearch=GO&order=1&ordby={$orderby}&start={$start}&limit={$limit}&alt=1\">முதல் பிரிவுி</a></th>";
		//echo "<th><a href=\"".$_SERVER['PHP_SELF']."?do=search&sfind={$query}&filters={$filters}&iSearch=GO&order=2&ordby={$orderby}&start={$start}&limit={$limit}&alt=1\">பிரிவு</a>முதற்குறிப்பு</th>";
		echo "<th align=\"center\"><a href=\"".$_SERVER['PHP_SELF']."?do=search&sfind={$query}&filters={$filters}&iSearch=GO&order=3&ordby={$orderby}&start={$start}&limit={$limit}&alt=1\">பாடல் </a></th>";
//		echo "<th><a href=\"#\">OPTIONS</a></th>";
		//echo "<th><a href=\"".$_SERVER['PHP_SELF']."?do=search&sfind={$query}&filters={$filters}&iSearch=GO&order={$ordfield}&ordby={$orderby}&start={$start}&limit={$limit}\">வ. எண்</a></th>";
		//echo "<th><a href=\"".$_SERVER['PHP_SELF']."?do=search&sfind={$query}&filters={$filters}&iSearch=GO&order=4&ordby={$orderby}&start={$start}&limit={$limit}&alt=1\">பிரிவு </a></th>";

		$i=($start*$limit)+1;
		$rstyle='';
		foreach($sResult as $row=>$cell){


            if($rstyle==''){
				echo "<tr>";
				$rstyle='style="background-color:#ddddff;"';
			}else{
				echo "<tr {$rstyle}>";
				$rstyle='';
			}
			$fileId=$cell['id'];
			if($cell['group_id'])
				$fileId=$cell['group_id'];
			
            $imageURL=SONGS_PATH.$cell['cid']."/".$fileId."_".urldecode($cell['fname'])."&w=150&h=100&zc=1";

            echo "<td align=\"center\">{$i}</td><td align=\"center\"><a href=\"search.php?do=view&sfind={$cell['fid']}&filters={$filters}&pid={$cell['id']}&b={$cell['name']}&f={$cell['first_category']}&l={$cell['third_cat']}&word={$_SESSION["desc"]}\" title=\"{$cell['filename']}\" class=\"green\">{$cell['fid']}</a></td>";

            echo "<td align=\"center\"><div class=\"thumb\"><a href=\"search.php?do=view&sfind={$cell['fid']}&filters={$cell['cid']}&pid={$cell['id']}\" class=\"green\">".$cell['first_category']."</td>";

			/*Number or Word Search*/
			$result='';
			if (is_numeric($query))
			{
				echo "<td align=\"center\">".$cell['description']."</td></tr>\n";
			} 
			else 
			{

					/*Search Code*/

                    $songs  =$cell['description'];

                    if($_REQUEST['sfind'])
                    {
                        $search_word = $_REQUEST['sfind'];
                    }else{
                        $search_word = '';
                    }
                    
                    $full_songs = highlightkeyword($songs, $search_word);
                
			        echo "<td align=\"center\" >".$full_songs."".$result."</td></tr>\n";  			
			}

		$i++;
		}
		//echo "<!--<td align=\"center\">{$cell['cname']}</td>";
		echo "</table>";
		echo $pageBar;

	}
}

function highlightkeyword($str, $search) {
    if(!empty($search))
    {
        $highlightcolor = "#2811e0";
        $occurrences = substr_count(strtolower($str), strtolower($search));
        $newstring = $str;
        $match = array();

        for ($i=0;$i<$occurrences;$i++) {
            $match[$i] = stripos($str, $search, $i);
            $match[$i] = substr($str, $match[$i], strlen($search));
            $newstring = str_replace($match[$i], '[#]'.$match[$i].'[@]', strip_tags($newstring));
        }

        $newstring = str_replace('[#]', '<span style="color: '.$highlightcolor.';font-weight: bold;">', $newstring);
        $newstring = str_replace('[@]', '</span>', $newstring);
        
    }else{
        $newstring = $str;
    }

    return $newstring;
 
}

?>